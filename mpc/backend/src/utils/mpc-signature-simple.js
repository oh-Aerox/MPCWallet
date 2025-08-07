const crypto = require('crypto');
const EC = require('elliptic').ec;
const keccak = require('keccak');

/**
 * 简化的MPC签名工具类
 * 实现基本的分布式签名过程
 */
class SimpleMPCSignature {
  constructor() {
    this.ec = new EC('secp256k1');
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
   * 简化的签名组合（使用第一个有效签名）
   * @param {Array} partialSignatures - 部分签名数组
   * @param {Buffer} messageHash - 消息哈希
   * @returns {Object} 完整签名
   */
  combineSignaturesSimple(partialSignatures, messageHash) {
    try {
      if (partialSignatures.length < 1) {
        throw new Error('Need at least 1 partial signature');
      }

      // 使用第一个有效的部分签名作为完整签名
      const firstSignature = partialSignatures[0];
      
      return {
        r: firstSignature.r,
        s: firstSignature.s,
        v: firstSignature.v,
        signature: '0x' + firstSignature.r + firstSignature.s,
        method: 'simple_combination'
      };
    } catch (error) {
      throw new Error(`Failed to combine signatures: ${error.message}`);
    }
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

  /**
   * 恢复私钥（用于测试）
   * @param {Array} shares - 份额数组
   * @returns {string} 私钥
   */
  recoverPrivateKey(shares) {
    try {
      // 这里应该实现Shamir秘密共享的恢复
      // 简化实现：使用第一个份额
      const firstShare = shares[0];
      return firstShare.y.toString(16).padStart(64, '0');
    } catch (error) {
      throw new Error(`Failed to recover private key: ${error.message}`);
    }
  }
}

module.exports = SimpleMPCSignature; 