const crypto = require('crypto');
const EC = require('elliptic').ec;
const keccak = require('keccak');
const { ShamirSecretSharing } = require('../../../mpc-core/src/index');

/**
 * MPC签名工具类
 * 实现分布式签名过程
 */
class MPCSignature {
  constructor() {
    this.ec = new EC('secp256k1');
    this.shamir = new ShamirSecretSharing();
  }

  /**
   * 生成部分签名
   * @param {BigInt} share - MPC份额
   * @param {Buffer} messageHash - 消息哈希
   * @param {number} shareIndex - 份额索引
   * @returns {Object} 部分签名
   */
  generatePartialSignature(share, messageHash, shareIndex) {
    try {
      // 将份额转换为椭圆曲线私钥
      const shareHex = share.toString(16).padStart(64, '0');
      const shareKey = this.ec.keyFromPrivate(shareHex, 'hex');
      
      // 生成部分签名
      const signature = shareKey.sign(messageHash);
      
      return {
        r: signature.r.toString('hex'),
        s: signature.s.toString('hex'),
        v: signature.recoveryParam,
        shareIndex: shareIndex,
        publicKey: shareKey.getPublic(false, 'hex').slice(2)
      };
    } catch (error) {
      throw new Error(`Failed to generate partial signature: ${error.message}`);
    }
  }

  /**
   * 验证部分签名
   * @param {Object} partialSignature - 部分签名
   * @param {Buffer} messageHash - 消息哈希
   * @param {string} publicKey - 公钥
   * @returns {boolean} 是否有效
   */
  verifyPartialSignature(partialSignature, messageHash, publicKey) {
    try {
      const key = this.ec.keyFromPublic('04' + publicKey, 'hex');
      const signature = {
        r: partialSignature.r,
        s: partialSignature.s,
        recoveryParam: partialSignature.v
      };
      
      return key.verify(messageHash, signature);
    } catch (error) {
      console.error('Partial signature verification failed:', error);
      return false;
    }
  }

  /**
   * 组合部分签名生成完整签名
   * @param {Array} partialSignatures - 部分签名数组
   * @param {Array} shares - 份额数组
   * @param {Buffer} messageHash - 消息哈希
   * @returns {Object} 完整签名
   */
  combineSignatures(partialSignatures, shares, messageHash) {
    try {
      if (partialSignatures.length < 2) {
        throw new Error('Need at least 2 partial signatures');
      }

      // 使用拉格朗日插值组合签名
      const threshold = shares[0].threshold;
      const rValues = [];
      const sValues = [];
      const ecN = BigInt(this.ec.n.toString());

      // 收集所有r和s值
      for (let i = 0; i < threshold; i++) {
        const sig = partialSignatures[i];
        rValues.push(BigInt('0x' + sig.r));
        sValues.push(BigInt('0x' + sig.s));
      }

      // 计算拉格朗日系数
      const lagrangeCoeffs = this.calculateLagrangeCoefficients(
        partialSignatures.slice(0, threshold).map(sig => BigInt(sig.shareIndex)),
        threshold
      );

      // 组合r值
      let combinedR = BigInt(0);
      for (let i = 0; i < threshold; i++) {
        combinedR = (combinedR + (rValues[i] * lagrangeCoeffs[i])) % ecN;
      }

      // 组合s值
      let combinedS = BigInt(0);
      for (let i = 0; i < threshold; i++) {
        combinedS = (combinedS + (sValues[i] * lagrangeCoeffs[i])) % ecN;
      }

      // 计算v值（恢复参数）
      const v = this.calculateRecoveryParam(combinedR, combinedS, messageHash);

      return {
        r: combinedR.toString(16),
        s: combinedS.toString(16),
        v: v,
        signature: '0x' + combinedR.toString(16).padStart(64, '0') + 
                   combinedS.toString(16).padStart(64, '0')
      };
    } catch (error) {
      throw new Error(`Failed to combine signatures: ${error.message}`);
    }
  }

  /**
   * 计算拉格朗日系数
   * @param {Array} indices - 份额索引
   * @param {number} threshold - 阈值
   * @returns {Array} 拉格朗日系数
   */
  calculateLagrangeCoefficients(indices, threshold) {
    const coeffs = [];
    const ecN = BigInt(this.ec.n.toString());
    
    for (let i = 0; i < threshold; i++) {
      let numerator = BigInt(1);
      let denominator = BigInt(1);
      
      for (let j = 0; j < threshold; j++) {
        if (i !== j) {
          const xi = indices[i];
          const xj = indices[j];
          numerator = (numerator * xj) % ecN;
          denominator = (denominator * (xi - xj)) % ecN;
        }
      }
      
      const coeff = (numerator * this.modInverse(denominator, ecN)) % ecN;
      coeffs.push(coeff);
    }
    
    return coeffs;
  }

  /**
   * 计算模逆元
   * @param {BigInt} a - 输入值
   * @param {BigInt} m - 模数
   * @returns {BigInt} 模逆元
   */
  modInverse(a, m) {
    let t = BigInt(0);
    let newT = BigInt(1);
    let r = m;
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
      t += m;
    }

    return t;
  }

  /**
   * 计算恢复参数
   * @param {BigInt} r - r值
   * @param {BigInt} s - s值
   * @param {Buffer} messageHash - 消息哈希
   * @returns {number} 恢复参数
   */
  calculateRecoveryParam(r, s, messageHash) {
    // 简化的恢复参数计算
    // 在实际应用中，需要更复杂的逻辑来确定正确的v值
    return 27; // 默认值，实际应该根据r、s和消息哈希计算
  }

  /**
   * 验证完整签名
   * @param {Object} signature - 完整签名
   * @param {Buffer} messageHash - 消息哈希
   * @param {string} publicKey - 公钥
   * @returns {boolean} 是否有效
   */
  verifySignature(signature, messageHash, publicKey) {
    try {
      const key = this.ec.keyFromPublic('04' + publicKey, 'hex');
      const sig = {
        r: signature.r,
        s: signature.s,
        recoveryParam: signature.v
      };
      
      return key.verify(messageHash, sig);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * 生成消息哈希
   * @param {Object} transaction - 交易对象
   * @returns {Buffer} 消息哈希
   */
  generateMessageHash(transaction) {
    // 创建标准化的交易数据
    const txData = {
      to: transaction.to,
      value: transaction.value,
      gas: transaction.gas || '21000',
      gasPrice: transaction.gasPrice || '20000000000',
      nonce: transaction.nonce || '0',
      data: transaction.data || ''
    };

    // 序列化交易数据
    const serialized = JSON.stringify(txData, Object.keys(txData).sort());
    
    // 计算Keccak-256哈希
    return keccak('keccak256').update(Buffer.from(serialized, 'utf8')).digest();
  }
}

module.exports = MPCSignature; 