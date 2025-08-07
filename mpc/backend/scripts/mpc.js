
const EC = require('elliptic').ec;
const keccak = require('keccak');
const crypto = require('crypto');

const { ShamirSecretSharing } = require('../../mpc-core/src/index');

const shamir = new ShamirSecretSharing();
const ec = new EC('secp256k1');
const key = ec.genKeyPair();
// 生成私钥
const privateKey = key.getPrivate('hex');
const privateKeyBigInt = BigInt('0x' + privateKey);

// 使用MPC分割私钥
const shares = shamir.split(privateKeyBigInt, 3, 2);

const publicKey = key.getPublic(false, 'hex').slice(2); // 去掉 0x04 前缀
const address = keccak('keccak256').update(Buffer.from(publicKey, 'hex')).digest('hex').slice(-40);


// 加密份额
function encryptShare(share) {
  try {
    // 获取加密密钥和算法
    const encryptionKey = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key';
    const algorithm = 'aes-256-gcm';
    
    // 确保密钥长度为32字节
    const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
    
    // 生成随机IV
    const iv = crypto.randomBytes(16);
    
    // 创建cipher
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(Buffer.from('MPC_SHARE', 'utf8'));
    
    // 加密份额
    const shareBuffer = Buffer.from(share.toString(), 'utf8');
    let encrypted = cipher.update(shareBuffer, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 获取认证标签
    const authTag = cipher.getAuthTag();
    
    // 组合IV、加密数据和认证标签
    const result = {
      iv: iv.toString('hex'),
      encrypted: encrypted,
      authTag: authTag.toString('hex')
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Encryption error:', error);
    // 降级到base64编码
    return Buffer.from(share.toString()).toString('base64');
  }
}

shares.forEach(share => {
  console.log(encryptShare(share.y));
});