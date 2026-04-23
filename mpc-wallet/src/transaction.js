'use strict';

/**
 * transaction.js — 以太坊交易构造与 MPC 签名集成
 *
 * 流程:
 *   1. 构造交易对象（to, value, nonce, gasPrice 等）
 *   2. RLP 编码并 keccak256 哈希 → 消息哈希
 *   3. 将哈希传入 TSS 签名协议（各方不暴露私钥）
 *   4. 聚合 (r, s) 并计算 v（以太坊要求）
 *   5. 输出可广播的 raw transaction
 */

const { keccak_256 } = require('@noble/hashes/sha3');
const { bytesToBigInt, bigIntToBytes32, N } = require('./field');

// ─── 简化 RLP 编码器 ──────────────────────────────────────────────
// 生产环境使用 ethers.js 或 @ethereumjs/tx

function rlpEncodeLength(len, offset) {
  if (len < 56) return Buffer.from([len + offset]);
  const lenBytes = bigIntToMinBytes(BigInt(len));
  return Buffer.from([lenBytes.length + offset + 55, ...lenBytes]);
}

function bigIntToMinBytes(n) {
  if (n === 0n) return Buffer.from([]);
  const hex = n.toString(16).padStart(n.toString(16).length % 2 === 0 ? undefined : n.toString(16).length + 1, '0');
  return Buffer.from(hex, 'hex');
}

function rlpEncodeItem(item) {
  if (item instanceof Buffer || item instanceof Uint8Array) {
    const buf = Buffer.from(item);
    if (buf.length === 1 && buf[0] < 0x80) return buf;
    return Buffer.concat([rlpEncodeLength(buf.length, 0x80), buf]);
  }
  if (typeof item === 'bigint') {
    if (item === 0n) return Buffer.from([0x80]); // RLP: empty string for 0
    const bytes = bigIntToMinBytes(item);
    return rlpEncodeItem(bytes);
  }
  if (typeof item === 'number') {
    return rlpEncodeItem(BigInt(item));
  }
  if (typeof item === 'string') {
    if (item.startsWith('0x')) return rlpEncodeItem(Buffer.from(item.slice(2), 'hex'));
    return rlpEncodeItem(Buffer.from(item, 'utf8'));
  }
  throw new Error(`无法 RLP 编码类型: ${typeof item}`);
}

function rlpEncodeList(items) {
  const encoded = items.map(rlpEncodeItem);
  const payload = Buffer.concat(encoded);
  return Buffer.concat([rlpEncodeLength(payload.length, 0xc0), payload]);
}

// ─── 交易哈希计算 ─────────────────────────────────────────────────

/**
 * 计算 EIP-155 交易的签名哈希（chainId 防重放）
 *
 * EIP-155: hash = keccak256(rlp([nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0]))
 *
 * @param {Object} tx - 交易参数
 * @param {number} chainId - 链 ID（1=mainnet, 11155111=sepolia）
 * @returns {{ hash: bigint, rlpEncoded: Buffer }}
 */
function hashTransaction(tx, chainId = 1) {
  const fields = [
    tx.nonce ?? 0,
    tx.gasPrice ?? 20000000000n,    // 20 Gwei
    tx.gasLimit ?? 21000n,
    tx.to ? Buffer.from(tx.to.replace('0x', ''), 'hex') : Buffer.alloc(0),
    tx.value ?? 0n,
    tx.data ? Buffer.from(tx.data.replace('0x', ''), 'hex') : Buffer.alloc(0),
    BigInt(chainId),
    0n,
    0n,
  ];

  const encoded = rlpEncodeList(fields);
  const hashBytes = keccak_256(encoded);
  const hash = bytesToBigInt(hashBytes);

  return { hash, rlpEncoded: encoded };
}

// ─── 序列化已签名的交易 ────────────────────────────────────────────

/**
 * 将签名 (r, s) 和交易组合成 raw transaction（可直接广播）
 *
 * EIP-155 签名后编码: rlp([nonce, gasPrice, gasLimit, to, value, data, v, r, s])
 * 其中 v = chainId * 2 + 35 或 chainId * 2 + 36
 *
 * @param {Object} tx
 * @param {{ r: bigint, s: bigint }} signature
 * @param {number} chainId
 * @param {bigint} recoveryBit - 0 或 1（从 R 点的奇偶性确定）
 * @returns {string} 0x 前缀的 hex 字符串
 */
function serializeSignedTransaction(tx, signature, chainId, recoveryBit = 0n) {
  const v = BigInt(chainId) * 2n + 35n + recoveryBit;

  const fields = [
    tx.nonce ?? 0,
    tx.gasPrice ?? 20000000000n,
    tx.gasLimit ?? 21000n,
    tx.to ? Buffer.from(tx.to.replace('0x', ''), 'hex') : Buffer.alloc(0),
    tx.value ?? 0n,
    tx.data ? Buffer.from(tx.data.replace('0x', ''), 'hex') : Buffer.alloc(0),
    v,
    signature.r,
    signature.s,
  ];

  const rawTx = rlpEncodeList(fields);
  return '0x' + rawTx.toString('hex');
}

// ─── 交易构造器 ──────────────────────────────────────────────────

/**
 * 构造标准 ETH 转账交易
 *
 * @param {Object} params
 * @param {string} params.from    - 发送方地址（MPC 钱包地址）
 * @param {string} params.to      - 接收方地址
 * @param {bigint} params.value   - 金额（wei）
 * @param {number} params.nonce   - 账户 nonce
 * @param {bigint} params.gasPrice - Gas 价格（wei）
 * @param {bigint} params.gasLimit - Gas 上限
 * @param {number} params.chainId  - 链 ID
 * @returns {Object} 交易对象
 */
function buildTransferTransaction(params) {
  return {
    from: params.from,
    to: params.to,
    value: params.value ?? 0n,
    nonce: params.nonce ?? 0,
    gasPrice: params.gasPrice ?? 20000000000n,  // 20 Gwei
    gasLimit: params.gasLimit ?? 21000n,
    data: '0x',
    chainId: params.chainId ?? 1,
  };
}

/**
 * 构造 ERC-20 转账交易（调用 transfer(address, uint256)）
 */
function buildERC20TransferTransaction(params) {
  // transfer(address,uint256) 的函数选择器
  const selector = '0xa9059cbb';
  // ABI 编码: to 地址（32 bytes）+ amount（32 bytes）
  const toEncoded = params.to.replace('0x', '').padStart(64, '0');
  const amountEncoded = params.amount.toString(16).padStart(64, '0');
  const data = selector + toEncoded + amountEncoded;

  return {
    from: params.from,
    to: params.tokenAddress,    // ERC-20 合约地址
    value: 0n,                  // ETH 金额为 0
    nonce: params.nonce ?? 0,
    gasPrice: params.gasPrice ?? 20000000000n,
    gasLimit: params.gasLimit ?? 65000n,  // ERC-20 需要更多 gas
    data,
    chainId: params.chainId ?? 1,
  };
}

/**
 * 格式化交易用于显示
 */
function formatTransaction(tx) {
  return {
    from: tx.from,
    to: tx.to,
    value: `${tx.value} wei (${Number(tx.value) / 1e18} ETH)`,
    nonce: tx.nonce,
    gasPrice: `${tx.gasPrice} wei`,
    gasLimit: tx.gasLimit.toString(),
    data: tx.data || '0x',
    chainId: tx.chainId,
  };
}

module.exports = {
  hashTransaction,
  serializeSignedTransaction,
  buildTransferTransaction,
  buildERC20TransferTransaction,
  formatTransaction,
  rlpEncodeList,
};
