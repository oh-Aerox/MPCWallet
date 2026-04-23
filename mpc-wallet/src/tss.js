'use strict';

/**
 * tss.js — 门限 ECDSA 签名（Threshold Signature Scheme）
 *
 * ═══════════════════════════════════════════════════════════
 * 数学背景：为什么分布式 ECDSA 很难？
 * ═══════════════════════════════════════════════════════════
 *
 * 标准 ECDSA: s = k⁻¹·(m + r·x) mod n
 *   k 是 nonce，x 是私钥，m 是消息哈希，r = R.x, R = k·G
 *
 * 挑战：公式同时涉及 k 和 x 的乘积
 *   - k 和 x 都必须分片存储
 *   - (k₁+k₂)⁻¹ ≠ k₁⁻¹ + k₂⁻¹，加法分享无法直接分解
 *
 * ═══════════════════════════════════════════════════════════
 * 本实现：乘法 k 分享 + 加法 x 分享（Lindell 2017 简化）
 * ═══════════════════════════════════════════════════════════
 *
 * 密钥 x：Shamir DKG → 用拉格朗日系数转为加法分片
 *   x̂ᵢ = λᵢ·xᵢ，使得 x̂_A + x̂_B = x
 *
 * Nonce k：乘法分享，k = kA·kB
 *   R = kA·G，然后 R = kB·R = k·G（k 无需重建）
 *
 * 签名协议（2 轮）:
 *   轮 1  方 A → 方 B: R_A = kA·G
 *   轮 2  方 B 计算:
 *     r = (kB·R_A).x mod n
 *     γ_B = kB⁻¹·(m + r·x̂_B)      ← 方 B 的贡献
 *     δ_B = kB⁻¹·r·x̂_A              ← 方 A 的 x 份额（真实协议用 MtA）
 *   方 A 计算:
 *     s = kA⁻¹·(γ_B + δ_B) = k⁻¹·(m + r·x)  ✓
 *
 * MtA 说明：
 *   δ_B（涉及 x̂_A）在生产实现中需要
 *   MtA（Multiplication-to-Addition）子协议，
 *   基于 Paillier 同态加密（GG18/GG20）或 OT（DKLS23）。
 *   本实现在教学场景中省略同态层，直接计算。
 *
 * 参考文献：
 *   Lindell 2017 https://eprint.iacr.org/2017/552
 *   GG18         https://eprint.iacr.org/2019/114
 *   CGGMP21      https://eprint.iacr.org/2021/060
 */

const {
  N, randomScalar,
  pointMul, pointFromBytes, pointToBytes,
  bigIntToHex, bigIntToBytes32,
  secp256k1,
} = require('./field');

const { modInv } = require('./vss');

// ─── 拉格朗日系数 ──────────────────────────────────────────────────

/**
 * 计算参与方 partyId 在 x=0 处的拉格朗日系数
 * λᵢ(0) = Π_{j≠i} (-j)/(i-j) mod n
 */
function lagrangeCoeff(partyId, signers) {
  const i = BigInt(partyId);
  let num = 1n, den = 1n;
  for (const j of signers) {
    if (j === partyId) continue;
    const jb = BigInt(j);
    num = (num * ((N - jb) % N)) % N;
    den = (den * ((i - jb + N) % N)) % N;
  }
  return (num * modInv(den, N)) % N;
}

// ─── Shamir 分片 → 加法分片 ────────────────────────────────────────

/**
 * 将 Shamir 分片转为加法分片
 * x̂ᵢ = λᵢ·xᵢ，使得 Σᵢ x̂ᵢ = x
 */
function toAdditiveShare(keyShare, partyId, signers) {
  const λ = lagrangeCoeff(partyId, signers);
  return (λ * keyShare) % N;
}

// ─── 两方签名协议 ──────────────────────────────────────────────────

/** 方 A — 轮次 1：生成乘法 nonce 分片，发布 R_A */
function signerA_Round1() {
  const kA = randomScalar();
  const R_A = pointToBytes(pointMul(kA));
  return { kA, R_A };
}

/**
 * 方 B — 轮次 2：接收 R_A，完成 R，计算签名贡献
 *
 * 数学证明 s = kA⁻¹·(γ_B + δ_B) = k⁻¹·(m + r·x)：
 *   s = kA⁻¹·(kB⁻¹·(m+r·x̂_B) + kB⁻¹·r·x̂_A)
 *     = kA⁻¹·kB⁻¹·(m + r·(x̂_A+x̂_B))
 *     = (kA·kB)⁻¹·(m + r·x)
 *     = k⁻¹·(m + r·x)  ✓
 */
function signerB_Round2(R_A, msgHash, xHatA, xHatB) {
  const kB = randomScalar();

  // k = kA·kB（乘法分享），R = kB·R_A = k·G
  const R = pointFromBytes(R_A).multiply(kB);
  const r = R.x % N;
  const kBInv = modInv(kB, N);

  // 方 B 的签名贡献
  const gammaB = (kBInv * ((msgHash + r * xHatB) % N)) % N;
  // 方 A 的 x 份额处理（真实协议通过 MtA 盲化，此处教学直接计算）
  const deltaB = (kBInv * r % N * xHatA) % N;

  return { kB, R: pointToBytes(R), r, gammaB, deltaB };
}

/** 方 A — 轮次 3（本地）：完成签名 s = kA⁻¹·(γ_B + δ_B) */
function signerA_Round3(kA, gammaB, deltaB) {
  const kAInv = modInv(kA, N);
  const s = (kAInv * ((gammaB + deltaB) % N)) % N;
  return s > N / 2n ? N - s : s; // 低 s 规范化（EIP-2）
}

// ─── 验证签名 ──────────────────────────────────────────────────────

/**
 * 验证 ECDSA 签名（与普通签名验证完全相同，体现链上不可区分性）
 */
function verifySignature(msgHash, signature, publicKeyBytes) {
  try {
    const sigObj = secp256k1.Signature.fromCompact(
      Buffer.concat([bigIntToBytes32(signature.r), bigIntToBytes32(signature.s)])
    );
    return secp256k1.verify(sigObj, bigIntToBytes32(msgHash), Buffer.from(publicKeyBytes));
  } catch {
    return false;
  }
}

// ─── 完整 TSS 签名流程（对外接口）───────────────────────────────────

/**
 * 运行完整的 TSS 签名协议
 *
 * @param {bigint} msgHash       - 消息哈希
 * @param {Object[]} allParties  - DKG 结果中的所有参与方
 * @param {number[]} signerIds   - 参与签名的方编号（需 >= 2）
 * @param {Buffer} groupPublicKey - 全局公钥
 * @returns {{ r, s, rHex, sHex, valid }}
 */
function runTSS(msgHash, allParties, signerIds, groupPublicKey) {
  if (signerIds.length < 2) {
    throw new Error(`需要至少 2 个签名方，当前 ${signerIds.length}`);
  }

  const [idA, idB, ...rest] = signerIds;
  const partyMap = new Map(allParties.map(p => [p.id, p]));
  const partyA = partyMap.get(idA);
  const partyB = partyMap.get(idB);

  if (!partyA || !partyB) throw new Error(`找不到签名方: ${signerIds}`);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  TSS 签名: 方 ${idA}（发起）& 方 ${idB}（协作）${rest.length ? ` + 方 ${rest.join(',')}（见证）` : ''}`);
  console.log(`  消息哈希: ${msgHash.toString(16).slice(0, 24)}...`);
  console.log(`${'─'.repeat(60)}`);

  // 步骤 1：Shamir 分片 → 加法 x 分片
  const twoSigners = [idA, idB];
  const xHatA = toAdditiveShare(partyA.keyShare, idA, twoSigners);
  const xHatB = toAdditiveShare(partyB.keyShare, idB, twoSigners);

  console.log(`\n  [预处理] Shamir → 加法分片`);
  console.log(`    x̂_A = λ_A·x_A = ${xHatA.toString(16).slice(0, 12)}...`);
  console.log(`    x̂_B = λ_B·x_B = ${xHatB.toString(16).slice(0, 12)}...`);

  // 步骤 2：方 A 轮次 1
  console.log(`\n  [轮次 1] 方 ${idA} → 方 ${idB}: R_A = kA·G`);
  const { kA, R_A } = signerA_Round1();
  console.log(`    R_A = ${Buffer.from(R_A).toString('hex').slice(0, 20)}...`);

  // 步骤 3：方 B 轮次 2
  console.log(`\n  [轮次 2] 方 ${idB}: k=kA·kB（乘法分享），计算 γ_B, δ_B`);
  const { r, gammaB, deltaB, R } = signerB_Round2(R_A, msgHash, xHatA, xHatB);
  console.log(`    R = ${Buffer.from(R).toString('hex').slice(0, 20)}...`);
  console.log(`    r = ${r.toString(16).slice(0, 16)}...`);
  console.log(`    γ_B = ${gammaB.toString(16).slice(0, 12)}...  δ_B = ${deltaB.toString(16).slice(0, 12)}... [MtA]`);

  // 步骤 4：方 A 轮次 3
  console.log(`\n  [轮次 3] 方 ${idA}: s = kA⁻¹·(γ_B + δ_B)`);
  const s = signerA_Round3(kA, gammaB, deltaB);
  console.log(`    s = ${s.toString(16).slice(0, 16)}...`);

  // 步骤 5：验证
  const valid = verifySignature(msgHash, { r, s }, groupPublicKey);
  console.log(`\n  签名验证: ${valid ? '✓ 通过（与普通 ECDSA 签名在链上不可区分）' : '✗ 失败'}`);

  if (!valid) throw new Error('TSS 签名验证失败！');

  return { r, s, rHex: bigIntToHex(r), sHex: bigIntToHex(s), valid };
}

module.exports = {
  lagrangeCoeff,
  toAdditiveShare,
  signerA_Round1,
  signerB_Round2,
  signerA_Round3,
  verifySignature,
  runTSS,
};
