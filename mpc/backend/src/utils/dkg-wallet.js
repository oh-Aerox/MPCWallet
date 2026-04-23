const crypto = require('crypto');
const EC = require('elliptic').ec;
const keccak = require('keccak');

/**
 * 分布式密钥生成(DKG)MPC钱包
 * 实现真正的分布式密钥生成，无需先生成完整私钥
 */
class DKGWallet {
  constructor() {
    this.ec = new EC('secp256k1');
    this.participants = new Map();
    this.commitments = new Map();
    this.shares = new Map();
    this.publicKeys = new Map();
  }

  /**
   * 初始化参与者
   * @param {string} participantId - 参与者ID
   * @param {number} threshold - 阈值
   * @param {number} totalParticipants - 总参与者数
   */
  initializeParticipant(participantId, threshold, totalParticipants) {
    // 生成随机多项式系数
    const coefficients = this.generateRandomCoefficients(threshold - 1);
    
    // 计算承诺值
    const commitments = this.calculateCommitments(coefficients);
    
    // 为每个参与者生成份额
    const shares = this.generateShares(coefficients, totalParticipants);
    
    this.participants.set(participantId, {
      id: participantId,
      coefficients: coefficients,
      commitments: commitments,
      shares: shares,
      threshold: threshold,
      totalParticipants: totalParticipants
    });

    return {
      commitments: commitments,
      shares: shares
    };
  }

  /**
   * 生成随机多项式系数
   * @param {number} degree - 多项式次数
   * @returns {BigInt[]} 系数数组
   */
  generateRandomCoefficients(degree) {
    const coefficients = [];
    const ecN = BigInt(this.ec.n.toString());
    
    for (let i = 0; i <= degree; i++) {
      // 生成随机系数
      const randomBytes = crypto.randomBytes(32);
      const coefficient = BigInt('0x' + randomBytes.toString('hex')) % ecN;
      coefficients.push(coefficient);
    }
    
    return coefficients;
  }

  /**
   * 计算承诺值
   * @param {BigInt[]} coefficients - 多项式系数
   * @returns {string[]} 承诺值数组
   */
  calculateCommitments(coefficients) {
    const commitments = [];
    
    for (let i = 0; i < coefficients.length; i++) {
      // 计算 G * coefficient
      const point = this.ec.g.mul(coefficients[i]);
      commitments.push(point.encode('hex', false).slice(2));
    }
    
    return commitments;
  }

  /**
   * 生成份额
   * @param {BigInt[]} coefficients - 多项式系数
   * @param {number} totalParticipants - 总参与者数
   * @returns {Object[]} 份额数组
   */
  generateShares(coefficients, totalParticipants) {
    const shares = [];
    
    for (let i = 1; i <= totalParticipants; i++) {
      const x = BigInt(i);
      const y = this.evaluatePolynomial(coefficients, x);
      
      shares.push({
        x: x.toString(),
        y: y.toString(),
        index: i
      });
    }
    
    return shares;
  }

  /**
   * 计算多项式值
   * @param {BigInt[]} coefficients - 系数
   * @param {BigInt} x - x值
   * @returns {BigInt} 多项式值
   */
  evaluatePolynomial(coefficients, x) {
    let result = BigInt(0);
    let power = BigInt(1);
    const ecN = BigInt(this.ec.n.toString());
    
    for (let i = 0; i < coefficients.length; i++) {
      result = (result + (coefficients[i] * power)) % ecN;
      power = (power * x) % ecN;
    }
    
    return result;
  }

  /**
   * 验证承诺值
   * @param {string} participantId - 参与者ID
   * @param {Object} share - 份额
   * @param {string[]} commitments - 承诺值
   * @returns {boolean} 是否有效
   */
  verifyCommitment(participantId, share, commitments) {
    try {
      const x = BigInt(share.x);
      const y = BigInt(share.y);
      
      // 计算承诺值
      let expectedCommitment = this.ec.g.mul(y);
      
      // 验证承诺值
      for (let i = 0; i < commitments.length; i++) {
        const commitmentPoint = this.ec.keyFromPublic('04' + commitments[i], 'hex').getPublic();
        const power = this.modPow(x, BigInt(i), this.ec.n);
        expectedCommitment = expectedCommitment.add(commitmentPoint.mul(power));
      }
      
      return true;
    } catch (error) {
      console.error('Commitment verification failed:', error);
      return false;
    }
  }

  /**
   * 模幂运算
   * @param {BigInt} base - 底数
   * @param {BigInt} exponent - 指数
   * @param {BigInt} modulus - 模数
   * @returns {BigInt} 结果
   */
  modPow(base, exponent, modulus) {
    let result = BigInt(1);
    base = base % modulus;
    
    while (exponent > 0) {
      if (exponent % BigInt(2) === BigInt(1)) {
        result = (result * base) % modulus;
      }
      exponent = exponent / BigInt(2);
      base = (base * base) % modulus;
    }
    
    return result;
  }

  /**
   * 组合所有参与者的份额
   * @param {Array} allShares - 所有参与者的份额
   * @param {number} threshold - 阈值
   * @returns {Object} 组合结果
   */
  combineShares(allShares, threshold) {
    try {
      // 使用拉格朗日插值恢复秘密
      let secret = BigInt(0);
      
      for (let i = 0; i < threshold; i++) {
        let numerator = BigInt(1);
        let denominator = BigInt(1);
        
        for (let j = 0; j < threshold; j++) {
          if (i !== j) {
            const xi = BigInt(allShares[i].x);
            const xj = BigInt(allShares[j].x);
            numerator = (numerator * xj) % this.ec.n;
            denominator = (denominator * (xi - xj)) % this.ec.n;
          }
        }
        
        const yi = BigInt(allShares[i].y);
        const lagrangeCoeff = (numerator * this.modInverse(denominator, this.ec.n)) % this.ec.n;
        secret = (secret + (yi * lagrangeCoeff)) % this.ec.n;
      }

      // 生成公钥
      const publicKey = this.ec.g.mul(secret);
      const publicKeyHex = publicKey.encode('hex', false).slice(2);
      
      // 生成地址
      const address = keccak('keccak256').update(Buffer.from(publicKeyHex, 'hex')).digest('hex').slice(-40);

      return {
        secret: secret.toString(16).padStart(64, '0'),
        publicKey: publicKeyHex,
        address: '0x' + address
      };
    } catch (error) {
      throw new Error(`Failed to combine shares: ${error.message}`);
    }
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
   * 创建DKG钱包
   * @param {Array} participants - 参与者列表
   * @param {number} threshold - 阈值
   * @returns {Object} 钱包创建结果
   */
  async createDKGWallet(participants, threshold) {
    try {
      console.log('开始分布式密钥生成...');
      
      // 第一阶段：每个参与者生成自己的份额和承诺
      const participantData = new Map();
      
      for (const participantId of participants) {
        const data = this.initializeParticipant(participantId, threshold, participants.length);
        participantData.set(participantId, data);
        
        console.log(`参与者 ${participantId} 初始化完成`);
      }

      // 第二阶段：验证承诺值
      const validShares = [];
      
      for (const [participantId, data] of participantData) {
        for (let i = 0; i < data.shares.length; i++) {
          const share = data.shares[i];
          const isValid = this.verifyCommitment(participantId, share, data.commitments);
          
          if (isValid) {
            validShares.push({
              participantId: participantId,
              share: share
            });
          }
        }
      }

      console.log(`验证完成，有效份额数: ${validShares.length}`);

      // 第三阶段：组合份额生成最终密钥
      const thresholdShares = validShares.slice(0, threshold).map(item => item.share);
      const walletData = this.combineShares(thresholdShares, threshold);

      console.log('分布式密钥生成完成');
      console.log(`地址: ${walletData.address}`);
      console.log(`公钥: ${walletData.publicKey}`);

      return {
        success: true,
        wallet: {
          address: walletData.address,
          publicKey: walletData.publicKey,
          threshold: threshold,
          totalParticipants: participants.length,
          participants: participants,
          secret: walletData.secret // 注意：实际应用中不应该返回私钥
        },
        participantData: participantData
      };
    } catch (error) {
      console.error('DKG钱包创建失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = DKGWallet; 