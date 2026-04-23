'use strict';

/**
 * dkg.js — 无 Dealer 分布式密钥生成（Pedersen DKG）
 *
 * 协议概述（3-of-2 门限，即 3 方参与，任意 2 方可签名）:
 *
 * 【阶段 1 - 各方生成本地多项式】
 *   每个参与方 i 独立:
 *   a) 随机选择 t-1 次多项式 fᵢ(x) = aᵢ₀ + aᵢ₁x（t=2 时为直线）
 *   b) 计算并广播多项式系数的椭圆曲线承诺 Cᵢⱼ = aᵢⱼ · G
 *
 * 【阶段 2 - 发送私密分片】
 *   每个参与方 i 对每个其他方 j 计算并秘密发送:
 *   sᵢⱼ = fᵢ(j)   （在真实系统中通过加密信道传输）
 *
 * 【阶段 3 - 验证并聚合分片】
 *   每个参与方 j 验证收到的 sᵢⱼ 与承诺一致，然后计算:
 *   xⱼ = Σᵢ sᵢⱼ   （所有收到的分片之和，即 j 方的最终私钥分片）
 *
 * 【结果】
 *   - 全局公钥 P = Σᵢ aᵢ₀ · G = Σᵢ Cᵢ₀（各方常数项承诺之和）
 *   - 方 j 的私钥分片 xⱼ = fᵢ(j) 的聚合，对应的"幽灵多项式" F(x) = Σᵢ fᵢ(x)
 *   - F(0) = Σᵢ aᵢ₀（全局私钥）从未被任何人计算或持有
 *
 * 安全性:
 *   - Feldman VSS 承诺防止恶意方发送无效分片
 *   - 每方的 aᵢ₀ 只有自己知道，F(0) 的安全性等价于各方秘密的联合安全性
 */

const {
  N, randomScalar, fieldAdd,
  pointMul, pointAdd, pointFromBytes, pointToBytes, pubKeyToAddress,
} = require('./field');

const {
  createPolynomial,
  evaluatePolynomial,
  verifyShard,
} = require('./vss');

// ─── 数据结构 ────────────────────────────────────────────────────────

/**
 * 参与方状态（整个 DKG 过程中持有）
 * @typedef {Object} PartyState
 * @property {number} id           - 参与方编号（1-indexed）
 * @property {number} n            - 总参与方数
 * @property {number} t            - 门限值
 * @property {bigint} secretScalar - 本地多项式的常数项 aᵢ₀（核心私密）
 * @property {bigint[]} coefficients - 完整的本地多项式系数（私密）
 * @property {Buffer[]} commitments  - 公开承诺 Cᵢⱼ = aᵢⱼ · G
 * @property {Map<number, bigint>} receivedShards - 从其他方收到的分片
 * @property {bigint|null} keyShare  - 最终的私钥分片 xᵢ（DKG 完成后）
 * @property {Buffer|null} publicKey - 全局公钥（DKG 完成后）
 * @property {string|null} address   - 以太坊收款地址（DKG 完成后）
 */

// ─── 阶段 1: 各方初始化 ─────────────────────────────────────────────

/**
 * 参与方 i 初始化：生成本地多项式并计算承诺
 *
 * @param {number} partyId - 参与方编号（1, 2, 3, ...）
 * @param {number} n       - 总参与方数（3-of-2 中 n=3）
 * @param {number} t       - 门限（3-of-2 中 t=2）
 * @returns {PartyState}
 */
function dkgPhase1_Init(partyId, n, t) {
  // 随机选择本方的私密常数项
  const secretScalar = randomScalar();

  // 用 Feldman VSS 构造多项式和承诺
  const { coefficients, commitments } = createPolynomial(secretScalar, t);

  return {
    id: partyId,
    n,
    t,
    secretScalar,    // ← 只有本方持有，永不传输
    coefficients,    // ← 只有本方持有，永不传输
    commitments,     // ← 广播给所有参与方
    receivedShards: new Map(),
    keyShare: null,
    publicKey: null,
    address: null,
  };
}

/**
 * 参与方 i 计算发给参与方 j 的分片
 *
 * sᵢⱼ = fᵢ(j)
 *
 * @param {PartyState} partyState - 发送方的状态
 * @param {number} targetId       - 接收方的编号
 * @returns {bigint} 分片值（通过加密信道发送给 targetId）
 */
function dkgPhase1_ComputeShard(partyState, targetId) {
  return evaluatePolynomial(partyState.coefficients, BigInt(targetId));
}

// ─── 阶段 2: 接收并验证分片 ─────────────────────────────────────────

/**
 * 参与方 j 接收来自参与方 i 的分片，并用承诺验证
 *
 * @param {PartyState} partyState   - 接收方的状态（会被 mutate）
 * @param {number} fromPartyId      - 发送方编号
 * @param {bigint} shard            - 收到的分片值 sᵢⱼ
 * @param {Buffer[]} commitments    - 发送方的公开承诺
 * @returns {boolean} 验证是否通过
 */
function dkgPhase2_ReceiveAndVerify(partyState, fromPartyId, shard, commitments) {
  // Feldman VSS 验证：sᵢⱼ · G == Σₖ Cᵢₖ · jᵏ
  const isValid = verifyShard(shard, partyState.id, commitments);

  if (!isValid) {
    throw new Error(
      `DKG 验证失败: 来自方 ${fromPartyId} 的分片不符合其承诺！` +
      `可能是恶意行为。`
    );
  }

  // 存储已验证的分片
  partyState.receivedShards.set(fromPartyId, shard);
  return true;
}

/**
 * 参与方 i 将自己的分片（自己给自己）也记录进来
 * （即 f_i(i)，自己不需要"发送"给自己，但需要纳入聚合）
 */
function dkgPhase2_AddSelfShard(partyState) {
  const selfShard = evaluatePolynomial(partyState.coefficients, BigInt(partyState.id));
  partyState.receivedShards.set(partyState.id, selfShard);
}

// ─── 阶段 3: 聚合分片，生成最终密钥材料 ────────────────────────────

/**
 * 参与方 j 聚合所有收到的分片，得到最终私钥分片
 *
 * xⱼ = Σᵢ sᵢⱼ（mod N）
 *
 * 这是方 j 在"幽灵多项式" F(x) = Σᵢ fᵢ(x) 上 x=j 处的值
 *
 * @param {PartyState} partyState          - 参与方状态（会被 mutate）
 * @param {Map<number, Buffer[]>} allCommitments - 所有参与方的承诺（用于公钥计算）
 * @returns {PartyState} 更新后的状态（包含 keyShare, publicKey, address）
 */
function dkgPhase3_Aggregate(partyState, allCommitments) {
  const { n, t } = partyState;

  // 验证所有分片都已收到
  if (partyState.receivedShards.size !== n) {
    throw new Error(
      `分片不完整: 已收到 ${partyState.receivedShards.size}/${n} 个分片`
    );
  }

  // 聚合私钥分片: xⱼ = Σᵢ sᵢⱼ mod N
  let keyShare = 0n;
  for (const [, shard] of partyState.receivedShards) {
    keyShare = (keyShare + shard) % N;
  }
  partyState.keyShare = keyShare;

  // 计算全局公钥: P = Σᵢ Cᵢ₀ = Σᵢ aᵢ₀ · G
  // 注: Cᵢ₀ 是各方承诺列表的第一个元素（常数项的承诺）
  let publicKeyPoint = null;
  for (let i = 1; i <= n; i++) {
    const commitments = allCommitments.get(i);
    if (!commitments || commitments.length === 0) {
      throw new Error(`缺少方 ${i} 的承诺`);
    }
    // 第 0 个承诺 = 常数项 aᵢ₀ 的承诺 = aᵢ₀ · G
    const C0 = pointFromBytes(commitments[0]);
    publicKeyPoint = publicKeyPoint === null ? C0 : publicKeyPoint.add(C0);
  }

  partyState.publicKey = pointToBytes(publicKeyPoint);
  partyState.address = pubKeyToAddress(publicKeyPoint);

  return partyState;
}

// ─── 完整的 DKG 模拟（在单进程中模拟三方通信）─────────────────────

/**
 * 完整运行 DKG 协议（3 方，门限 2）
 * 在真实系统中，各阶段数据通过加密网络传输；
 * 此处在内存中模拟消息传递，逻辑完全等价。
 *
 * @param {number} n - 参与方总数（默认 3）
 * @param {number} t - 门限（默认 2）
 * @returns {{ parties: PartyState[], groupPublicKey: Buffer, address: string }}
 */
function runDKG(n = 3, t = 2) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  DKG 协议启动: ${n} 方参与，门限 ${t}-of-${n}`);
  console.log(`${'═'.repeat(60)}`);

  // ── 阶段 1: 各方初始化，生成多项式和承诺 ─────────────────────────
  console.log('\n【阶段 1】各方生成本地多项式...');
  const parties = [];
  for (let i = 1; i <= n; i++) {
    const party = dkgPhase1_Init(i, n, t);
    parties.push(party);
    console.log(`  方 ${i}: 生成多项式，常数项（私密）= ${party.secretScalar.toString(16).slice(0, 12)}...`);
    console.log(`         承诺 C${i}₀ = ${Buffer.from(party.commitments[0]).toString('hex').slice(0, 16)}...`);
  }

  // ── 广播承诺（在真实系统中通过公告板/P2P 广播）────────────────────
  const allCommitments = new Map();
  parties.forEach(p => allCommitments.set(p.id, p.commitments));

  // ── 阶段 2: 各方计算并"发送"分片，接收方验证 ─────────────────────
  console.log('\n【阶段 2】交换并验证分片...');
  for (const sender of parties) {
    // 先加入自己的分片
    dkgPhase2_AddSelfShard(sender);

    for (const receiver of parties) {
      if (sender.id === receiver.id) continue;

      // 发送方计算给接收方的分片
      const shard = dkgPhase1_ComputeShard(sender, receiver.id);

      // 接收方验证（真实系统中这步在接收方机器上运行）
      dkgPhase2_ReceiveAndVerify(
        receiver,
        sender.id,
        shard,
        allCommitments.get(sender.id)
      );

      console.log(`  方 ${sender.id} → 方 ${receiver.id}: 分片 s${sender.id}${receiver.id} = ${shard.toString(16).slice(0, 12)}... ✓`);
    }
  }

  // ── 阶段 3: 各方聚合分片，独立计算出一致的公钥 ───────────────────
  console.log('\n【阶段 3】聚合分片，生成密钥材料...');
  for (const party of parties) {
    dkgPhase3_Aggregate(party, allCommitments);
    console.log(`  方 ${party.id}: 私钥分片 = ${party.keyShare.toString(16).slice(0, 12)}...`);
    console.log(`         公钥验证 = ${Buffer.from(party.publicKey).toString('hex').slice(0, 16)}...`);
  }

  // 验证所有方计算出的公钥一致
  const pubKeyHex = Buffer.from(parties[0].publicKey).toString('hex');
  const allAgreee = parties.every(
    p => Buffer.from(p.publicKey).toString('hex') === pubKeyHex
  );

  if (!allAgreee) {
    throw new Error('DKG 错误: 各方计算的公钥不一致！');
  }

  const groupPublicKey = parties[0].publicKey;
  const address = parties[0].address;

  console.log(`\n  全局公钥: ${Buffer.from(groupPublicKey).toString('hex')}`);
  console.log(`  收款地址: ${address}`);
  console.log(`  注意: 完整私钥 F(0) 从未被任何方持有或计算`);
  console.log(`${'═'.repeat(60)}\n`);

  return { parties, groupPublicKey, address };
}

module.exports = {
  dkgPhase1_Init,
  dkgPhase1_ComputeShard,
  dkgPhase2_ReceiveAndVerify,
  dkgPhase2_AddSelfShard,
  dkgPhase3_Aggregate,
  runDKG,
};
