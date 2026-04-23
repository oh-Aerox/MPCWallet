'use strict';

/**
 * field.js — 有限域算术 & 椭圆曲线辅助函数
 *
 * secp256k1 曲线参数:
 *   阶 n = FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE BAAEDCE6 AF48A03B BFD25E8C D0364141
 *   所有私钥运算都在 mod n 的域 Fₙ 上进行
 *   所有点运算都在曲线群 G 上进行
 */

const { secp256k1 } = require('@noble/curves/secp256k1');
const { keccak_256 } = require('@noble/hashes/sha3');
const { sha256 } = require('@noble/hashes/sha256');
const { hmac } = require('@noble/hashes/hmac');
const { randomBytes } = require('@noble/hashes/utils');

// 曲线阶 n（所有私钥运算模此值）
const N = secp256k1.CURVE.n;
// 生成元 G
const G = secp256k1.ProjectivePoint.BASE;

// ─── 域运算（mod n）──────────────────────────────────────────────

/** 规范化到 [0, n) */
const mod = (a) => ((a % N) + N) % N;

/** 加法 mod n */
const fieldAdd = (a, b) => mod(a + b);

/** 减法 mod n */
const fieldSub = (a, b) => mod(a - b);

/** 乘法 mod n */
const fieldMul = (a, b) => mod(a * b);

/** 模逆元（费马小定理：a^(n-2) mod n） */
const fieldInv = (a) => modPow(mod(a), N - 2n, N);

/** 快速幂（base^exp mod m） */
function modPow(base, exp, m) {
  let result = 1n;
  base = ((base % m) + m) % m;
  while (exp > 0n) {
    if (exp & 1n) result = (result * base) % m;
    base = (base * base) % m;
    exp >>= 1n;
  }
  return result;
}

// ─── 随机数生成 ────────────────────────────────────────────────────

/**
 * 生成安全随机标量（私钥空间内）
 * 使用 noble/hashes 的 randomBytes（基于 crypto.getRandomValues）
 */
function randomScalar() {
  while (true) {
    const bytes = randomBytes(32);
    const scalar = bytesToBigInt(bytes);
    if (scalar > 0n && scalar < N) return scalar;
  }
}

// ─── 字节转换工具 ──────────────────────────────────────────────────

function bytesToBigInt(bytes) {
  let result = 0n;
  for (const byte of bytes) result = (result << 8n) | BigInt(byte);
  return result;
}

function bigIntToBytes32(n) {
  const hex = n.toString(16).padStart(64, '0');
  return Buffer.from(hex, 'hex');
}

function bigIntToHex(n) {
  return '0x' + n.toString(16).padStart(64, '0');
}

// ─── 椭圆曲线点操作 ────────────────────────────────────────────────

/**
 * 标量乘法：scalar * G
 * 返回 ProjectivePoint
 */
const pointMul = (scalar) => G.multiply(mod(scalar));

/**
 * 点加法
 */
const pointAdd = (P, Q) => P.add(Q);

/**
 * 从压缩公钥字节还原点
 */
const pointFromBytes = (bytes) =>
  secp256k1.ProjectivePoint.fromHex(Buffer.from(bytes).toString('hex'));

/**
 * 点序列化为压缩格式（33 bytes）
 */
const pointToBytes = (P) =>
  Buffer.from(P.toRawBytes(true));

/**
 * 非压缩公钥（65 bytes，去掉 0x04 前缀后 64 bytes）→ 以太坊地址
 */
function pubKeyToAddress(pubKeyPoint) {
  const uncompressed = pubKeyPoint.toRawBytes(false); // 65 bytes: 0x04 + x + y
  const pubKeyBytes = uncompressed.slice(1);           // 去掉 0x04，取 64 bytes
  const hash = keccak_256(pubKeyBytes);                // keccak256(x || y)
  const address = Buffer.from(hash).slice(12);         // 取最后 20 bytes
  return '0x' + address.toString('hex');
}

// ─── 哈希工具 ──────────────────────────────────────────────────────

/** SHA-256，返回 BigInt */
const sha256BigInt = (data) => bytesToBigInt(sha256(data));

/** HMAC-SHA256，用于确定性随机数生成（RFC 6979 思路） */
const hmacSha256 = (key, ...messages) => {
  const h = hmac.create(sha256, key);
  for (const msg of messages) h.update(msg);
  return h.digest();
};

/**
 * 对消息哈希（模拟以太坊 personal_sign 前缀）
 * eth_sign: keccak256("\x19Ethereum Signed Message:\n" + len + message)
 */
function hashMessage(message) {
  const prefix = `\x19Ethereum Signed Message:\n${message.length}`;
  const prefixBytes = Buffer.from(prefix, 'utf8');
  const msgBytes = Buffer.from(message, 'utf8');
  const combined = Buffer.concat([prefixBytes, msgBytes]);
  const hash = keccak_256(combined);
  return bytesToBigInt(hash);
}

/**
 * 对交易数据哈希（直接 keccak256，用于 RLP 编码后的交易）
 */
function hashTransaction(txBytes) {
  return bytesToBigInt(keccak_256(txBytes));
}

module.exports = {
  N,
  G,
  mod,
  fieldAdd,
  fieldSub,
  fieldMul,
  fieldInv,
  modPow,
  randomScalar,
  bytesToBigInt,
  bigIntToBytes32,
  bigIntToHex,
  pointMul,
  pointAdd,
  pointFromBytes,
  pointToBytes,
  pubKeyToAddress,
  sha256BigInt,
  hmacSha256,
  hashMessage,
  hashTransaction,
  secp256k1,
};
