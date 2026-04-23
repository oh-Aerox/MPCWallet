'use strict';

/**
 * hdwallet.js — 基于 MPC 公钥的 HD 派生（公钥侧，无需私钥）
 *
 * 核心原理（BIP-32 公钥侧派生）:
 *   普通 HD:  child_privkey = parent_privkey + HMAC(parent_pubkey, chaincode, index)
 *   公钥侧:  child_pubkey  = parent_pubkey + HMAC(parent_pubkey, chaincode, index) · G
 *
 * 后者完全不需要私钥参与！
 *
 * 对 MPC 的意义:
 *   - MPC 生成的公钥 P（及链码 chaincode）对外公开
 *   - 服务端可以无限派生子地址，不需要触发任何 MPC 协议
 *   - 只有花费某个子地址的资金时，才需要 MPC 各方协作签名
 *   - 签名时各方对自己的主密钥分片做同样的派生得到子分片
 *
 * 注意: 本实现简化了 BIP-32 的链码管理，聚焦展示核心派生逻辑。
 */

const { sha256 } = require('@noble/hashes/sha256');
const { hmac } = require('@noble/hashes/hmac');
const { keccak_256 } = require('@noble/hashes/sha3');

const {
  N, mod,
  pointFromBytes, pointToBytes, pointMul, pubKeyToAddress,
  bytesToBigInt, bigIntToBytes32,
} = require('./field');

// ─── 链码生成 ──────────────────────────────────────────────────────

/**
 * 从主公钥生成根链码（确定性，基于公钥的 SHA-256）
 * 生产环境中链码在 DKG 时一并生成，保存在 xpub 中
 *
 * @param {Buffer} publicKeyBytes - 压缩主公钥（33 bytes）
 * @returns {Buffer} 32 bytes 链码
 */
function deriveRootChainCode(publicKeyBytes) {
  // 真实 BIP-32: 链码来自 HMAC-SHA512("Bitcoin seed", master_seed) 的右半部分
  // 此处简化: 对公钥做哈希作为根链码
  const data = Buffer.concat([Buffer.from('MPC-Wallet-Chain-Code'), publicKeyBytes]);
  return Buffer.from(sha256(data));
}

// ─── BIP-32 公钥侧子密钥派生 ──────────────────────────────────────

/**
 * 从父公钥派生子公钥（公钥侧 BIP-32，non-hardened 路径）
 *
 * BIP-32 公钥派生:
 *   I = HMAC-SHA512(key=chaincode, data=pubkey || index)
 *   IL = I[:32]（左 32 bytes，用于密钥调整）
 *   IR = I[32:]（右 32 bytes，子链码）
 *   child_pubkey = parent_pubkey + IL · G
 *
 * @param {Buffer} parentPubKey   - 父公钥（压缩，33 bytes）
 * @param {Buffer} chainCode      - 父链码（32 bytes）
 * @param {number} index          - 子索引（0 到 2^31-1，non-hardened）
 * @returns {{ childPubKey: Buffer, childChainCode: Buffer, tweak: bigint }}
 */
function deriveChildPublicKey(parentPubKey, chainCode, index) {
  // 构造 HMAC 数据: 压缩公钥 || index（4 bytes big-endian）
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32BE(index, 0);
  const data = Buffer.concat([parentPubKey, indexBuf]);

  // HMAC-SHA512（此处用两次 SHA256 模拟，生产中用 @noble/hashes/sha512 的 hmac）
  // 左半部分作为 tweak，右半部分作为子链码
  const hmacLeft = hmac(sha256, chainCode, Buffer.concat([data, Buffer.from([0])]));
  const hmacRight = hmac(sha256, chainCode, Buffer.concat([data, Buffer.from([1])]));

  const IL = Buffer.from(hmacLeft);    // 32 bytes，密钥调整量
  const childChainCode = Buffer.from(hmacRight); // 32 bytes，子链码

  // tweak = IL 作为标量
  const tweak = bytesToBigInt(IL) % N;

  // child_pubkey = parent_pubkey + tweak · G
  const parentPoint = pointFromBytes(parentPubKey);
  const tweakPoint = pointMul(tweak);
  const childPoint = parentPoint.add(tweakPoint);

  return {
    childPubKey: pointToBytes(childPoint),
    childChainCode,
    tweak, // 签名时，各方在自己的私钥分片上加上这个 tweak
  };
}

/**
 * 从主公钥按路径派生子公钥（简化路径，如 m/0/42 → [0, 42]）
 *
 * @param {Buffer} masterPubKey - MPC 生成的主公钥
 * @param {Buffer} masterChainCode - 根链码
 * @param {number[]} path - 索引路径（如 [0, 42] 对应 m/0/42）
 * @returns {{ pubKey: Buffer, chainCode: Buffer, address: string, tweaks: bigint[] }}
 */
function derivePathPublicKey(masterPubKey, masterChainCode, path) {
  let pubKey = masterPubKey;
  let chainCode = masterChainCode;
  const tweaks = [];

  for (const index of path) {
    const { childPubKey, childChainCode, tweak } = deriveChildPublicKey(
      pubKey, chainCode, index
    );
    pubKey = childPubKey;
    chainCode = childChainCode;
    tweaks.push(tweak);
  }

  const point = pointFromBytes(pubKey);
  const address = pubKeyToAddress(point);

  return { pubKey, chainCode, address, tweaks };
}

// ─── 签名时派生子私钥分片（各方本地执行）─────────────────────────

/**
 * 将累计 tweak 应用到私钥分片上
 * 当需要对某个子地址签名时，各方用此函数调整自己的分片
 *
 * child_keyShare_i = keyShare_i + Σ tweaks（所有路径层的 tweak 之和）
 *
 * 这是公钥侧派生正确性的保证：
 *   Σᵢ λᵢ · child_keyShare_i = F(0) + tweak = 子私钥
 *   child_pubkey = (F(0) + tweak) · G = F(0)·G + tweak·G = 主公钥 + tweak·G ✓
 *
 * @param {bigint} keyShare  - 主密钥分片
 * @param {bigint[]} tweaks  - 路径上各层的 tweak 标量
 * @returns {bigint} 子密钥分片
 */
function applyTweaksToKeyShare(keyShare, tweaks) {
  let adjusted = keyShare;
  for (const tweak of tweaks) {
    adjusted = (adjusted + tweak) % N;
  }
  return adjusted;
}

// ─── 商户收款地址批量派生 ──────────────────────────────────────────

/**
 * 为商户批量派生收款地址（模拟每单独立地址）
 * 路径约定: m/0/{orderId}
 *
 * @param {Buffer} masterPubKey
 * @param {Buffer} masterChainCode
 * @param {number} count - 派生地址数量
 * @param {number} startIndex - 起始索引（默认 0）
 * @returns {Array<{ index: number, address: string, pubKey: string }>}
 */
function deriveReceivingAddresses(masterPubKey, masterChainCode, count, startIndex = 0) {
  const addresses = [];

  // 先派生到账户层 m/0（固定的 receiving 层）
  const { childPubKey: accountPubKey, childChainCode: accountChainCode } =
    deriveChildPublicKey(masterPubKey, masterChainCode, 0);

  for (let i = startIndex; i < startIndex + count; i++) {
    const { pubKey, address, tweaks } = derivePathPublicKey(
      accountPubKey,
      accountChainCode,
      [i]
    );

    addresses.push({
      index: i,
      path: `m/0/${i}`,
      address,
      pubKey: Buffer.from(pubKey).toString('hex'),
      tweaks: tweaks.map(t => t.toString(16)), // 签名时需要
    });
  }

  return addresses;
}

module.exports = {
  deriveRootChainCode,
  deriveChildPublicKey,
  derivePathPublicKey,
  applyTweaksToKeyShare,
  deriveReceivingAddresses,
};
