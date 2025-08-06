const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Shamir秘密共享算法实现
 */
class ShamirSecretSharing {
  constructor(prime = null) {
    // 使用一个大的素数作为有限域
    this.prime = prime || BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');
    this.generator = BigInt(2);
  }

  /**
   * 生成随机多项式
   * @param {number} degree - 多项式次数
   * @param {BigInt} secret - 秘密值
   * @returns {BigInt[]} 多项式系数
   */
  generatePolynomial(degree, secret) {
    const coefficients = [secret];
    
    for (let i = 1; i <= degree; i++) {
      // 生成随机系数
      const randomBytes = crypto.randomBytes(32);
      const coefficient = BigInt('0x' + randomBytes.toString('hex')) % this.prime;
      coefficients.push(coefficient);
    }
    
    return coefficients;
  }

  /**
   * 计算多项式在给定点的值
   * @param {BigInt[]} coefficients - 多项式系数
   * @param {BigInt} x - x坐标
   * @returns {BigInt} 多项式值
   */
  evaluatePolynomial(coefficients, x) {
    let result = BigInt(0);
    let power = BigInt(1);
    
    for (let i = 0; i < coefficients.length; i++) {
      result = (result + (coefficients[i] * power)) % this.prime;
      power = (power * x) % this.prime;
    }
    
    return result;
  }

  /**
   * 分割秘密
   * @param {BigInt} secret - 要分割的秘密
   * @param {number} totalShares - 总份额数
   * @param {number} threshold - 恢复阈值
   * @returns {Array} 份额数组
   */
  split(secret, totalShares, threshold) {
    if (threshold > totalShares) {
      throw new Error('Threshold cannot be greater than total shares');
    }

    const coefficients = this.generatePolynomial(threshold - 1, secret);
    const shares = [];

    for (let i = 1; i <= totalShares; i++) {
      const x = BigInt(i);
      const y = this.evaluatePolynomial(coefficients, x);
      shares.push({
        id: uuidv4(),
        index: i,
        x: x.toString(),
        y: y.toString(),
        threshold,
        totalShares
      });
    }

    return shares;
  }

  /**
   * 使用拉格朗日插值恢复秘密
   * @param {Array} shares - 份额数组
   * @returns {BigInt} 恢复的秘密
   */
  reconstruct(shares) {
    if (shares.length < 2) {
      throw new Error('Need at least 2 shares to reconstruct');
    }

    let secret = BigInt(0);
    const threshold = shares[0].threshold;

    for (let i = 0; i < threshold; i++) {
      let numerator = BigInt(1);
      let denominator = BigInt(1);
      
      for (let j = 0; j < threshold; j++) {
        if (i !== j) {
          const xi = BigInt(shares[i].x);
          const xj = BigInt(shares[j].x);
          numerator = (numerator * xj) % this.prime;
          denominator = (denominator * (xi - xj)) % this.prime;
        }
      }
      
      const yi = BigInt(shares[i].y);
      const lagrangeCoeff = (numerator * this.modInverse(denominator)) % this.prime;
      secret = (secret + (yi * lagrangeCoeff)) % this.prime;
    }

    return secret;
  }

  /**
   * 计算模逆元
   * @param {BigInt} a - 输入值
   * @returns {BigInt} 模逆元
   */
  modInverse(a) {
    let t = BigInt(0);
    let newT = BigInt(1);
    let r = this.prime;
    let newR = a;

    while (newR !== BigInt(0)) {
      const quotient = r / newR;
      [t, newT] = [newT, t - quotient * newT];
      [r, newR] = [newR, r - quotient * newR];
    }

    if (r > BigInt(1)) {
      throw new Error('Multiplicative inverse does not exist');
    }

    if (t < BigInt(0)) {
      t += this.prime;
    }

    return t;
  }

  /**
   * 验证份额
   * @param {Object} share - 份额对象
   * @returns {boolean} 是否有效
   */
  validateShare(share) {
    try {
      const x = BigInt(share.x);
      const y = BigInt(share.y);
      
      // 检查坐标是否在有效范围内
      if (x <= BigInt(0) || x >= this.prime) {
        return false;
      }
      
      if (y < BigInt(0) || y >= this.prime) {
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 生成新的份额（用于份额轮换）
   * @param {Array} oldShares - 旧份额
   * @param {number} newTotalShares - 新总份额数
   * @param {number} newThreshold - 新阈值
   * @returns {Array} 新份额数组
   */
  refreshShares(oldShares, newTotalShares, newThreshold) {
    // 首先恢复原始秘密
    const secret = this.reconstruct(oldShares);
    
    // 生成新的份额
    return this.split(secret, newTotalShares, newThreshold);
  }

  /**
   * 份额验证（验证份额是否来自同一个秘密）
   * @param {Array} shares - 份额数组
   * @returns {boolean} 是否来自同一个秘密
   */
  verifyShares(shares) {
    if (shares.length < 2) {
      return false;
    }

    try {
      // 尝试恢复秘密
      this.reconstruct(shares);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = ShamirSecretSharing; 