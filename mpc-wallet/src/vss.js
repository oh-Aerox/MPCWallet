'use strict';

/**
 * vss.js — Feldman 可验证秘密共享（Verifiable Secret Sharing）
 *
 * 为什么需要 VSS 而不是普通 SSS？
 * 在无 dealer 的 DKG 中，每一方发送分片给其他方，但接收方无法验证
 * 收到的分片是否来自一个合法的多项式（对方可能发送随机垃圾）。
 * Feldman VSS 让发送方同时发布多项式系数的公钥承诺（commitment），
 * 接收方可以用椭圆曲线验证分片的合法性，而不暴露私密系数。
 *
 * 协议:
 *   发送方 i 选择多项式 fᵢ(x) = aᵢ₀ + aᵢ₁x + aᵢ₂x² (2-of-3: t=2)
 *   公开承诺: Cᵢⱼ = aᵢⱼ · G（椭圆曲线点）
 *   发送给 j 的分片: sᵢⱼ = fᵢ(j)
 *
 *   接收方验证: sᵢⱼ · G == Σ Cᵢₖ · jᵏ
 */

const {
  N, fieldAdd, fieldMul, randomScalar,
  pointMul, pointAdd, pointToBytes, pointFromBytes,
  bigIntToBytes32, bytesToBigInt,
} = require('./field');

/**
 * 创建 Feldman VSS 多项式
 *
 * @param {bigint} secret - 该方的私密值 aᵢ₀（常数项）
 * @param {number} threshold - 门限 t（需要 t 方才能重建）
 * @returns {{ coefficients: bigint[], commitments: Buffer[] }}
 *   coefficients: 多项式系数 [a₀, a₁, ..., a_{t-1}]（保密）
 *   commitments:  对应的椭圆曲线承诺 [a₀G, a₁G, ..., a_{t-1}G]（公开）
 */
function createPolynomial(secret, threshold) {
  console.log('创建 VSS 多项式，秘密:', secret);
  // 系数 [a₀=secret, a₁, a₂, ..., a_{t-1}]（均为随机标量）
  const coefficients = [secret];
  for (let i = 1; i < threshold; i++) {
    const temp =randomScalar();
    console.log('多项式系数1:', temp);
    coefficients.push(temp);
  }

  // 承诺 Cⱼ = aⱼ · G
  const commitments = coefficients.map(a => pointToBytes(pointMul(a)));

  return { coefficients, commitments };
}

/**
 * 对 x 坐标求多项式值（Horner 法）
 * f(x) = a₀ + a₁x + a₂x² + ... = a₀ + x(a₁ + x(a₂ + ...))
 *
 * @param {bigint[]} coefficients
 * @param {bigint} x
 * @returns {bigint} f(x) mod N
 */
function evaluatePolynomial(coefficients, x) {
  let result = 0n;
  // 从高次到低次的 Horner 求值
  for (let i = coefficients.length - 1; i >= 0; i--) {
    result = (result * x + coefficients[i]) % N;
  }
  return ((result % N) + N) % N;
}

/**
 * 验证收到的分片是否与承诺一致
 *
 * 验证等式: sᵢⱼ · G == Σₖ Cᵢₖ · jᵏ
 *
 * @param {bigint} shard   - 收到的分片值（标量）
 * @param {number} x       - 接收方的 x 坐标（1-indexed party id）
 * @param {Buffer[]} commitments - 发送方的承诺列表
 * @returns {boolean}
 */
function verifyShard(shard, x, commitments) {
  // 左边: shard · G
  const lhs = pointMul(shard);

  // 右边: Σ Cₖ · xᵏ
  // = C₀ · x⁰ + C₁ · x¹ + C₂ · x² + ...
  let rhs = null;
  let xPow = 1n; // x 的幂次

  for (const commitBytes of commitments) {
    const C = pointFromBytes(commitBytes);
    // C · xᵏ
    const term = C.multiply(xPow);
    rhs = rhs === null ? term : rhs.add(term);
    xPow = (xPow * BigInt(x)) % N;
  }

  // 比较两个点是否相等
  return lhs.equals(rhs);
}

/**
 * 拉格朗日插值：从 t 个分片还原 f(0)（即私钥）
 *
 * 仅用于教学验证目的。真实 TSS 中，f(0) 永不被重建。
 *
 * @param {{ x: number, y: bigint }[]} shardsAtX - 至少 t 个 { x, y=f(x) } 点
 * @returns {bigint} f(0) mod N
 */
function lagrangeInterpolateAtZero(shardsAtX) {
  let secret = 0n;

  for (let i = 0; i < shardsAtX.length; i++) {
    const { x: xᵢ, y: yᵢ } = shardsAtX[i];
    const xᵢBig = BigInt(xᵢ);

    // 计算拉格朗日基多项式在 x=0 处的值
    // λᵢ(0) = Π_{j≠i} (0 - xⱼ) / (xᵢ - xⱼ)
    let num = 1n;
    let den = 1n;

    for (let j = 0; j < shardsAtX.length; j++) {
      if (i === j) continue;
      const xⱼBig = BigInt(shardsAtX[j].x);
      num = (num * ((-xⱼBig + N) % N)) % N;              // (0 - xⱼ) mod N
      den = (den * ((xᵢBig - xⱼBig + N) % N)) % N;       // (xᵢ - xⱼ) mod N
    }

    // λᵢ = num · den⁻¹ mod N
    const lambda = (num * modInv(den, N)) % N;
    // 累加 yᵢ · λᵢ
    secret = (secret + yᵢ * lambda) % N;
  }

  return secret;
}

/**
 * 模逆元（扩展欧几里得算法）
 */
function modInv(a, m) {
  let [old_r, r] = [a, m];
  let [old_s, s] = [1n, 0n];
  while (r !== 0n) {
    const q = old_r / r;
    [old_r, r] = [r, old_r - q * r];
    [old_s, s] = [s, old_s - q * s];
  }
  return ((old_s % m) + m) % m;
}

module.exports = {
  createPolynomial,
  evaluatePolynomial,
  verifyShard,
  lagrangeInterpolateAtZero,
  modInv,
};
