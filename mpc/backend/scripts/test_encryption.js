const crypto = require('crypto');

// 模拟环境变量
process.env.ENCRYPTION_KEY = 'your-32-character-encryption-key';
process.env.ENCRYPTION_ALGORITHM = 'aes-256-gcm';

// 加密份额函数
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

function decryptShare(encryptedShare) {
  try {
    // 尝试解析JSON格式的加密数据
    const encryptedData = JSON.parse(encryptedShare);
    
    if (encryptedData.iv && encryptedData.encrypted && encryptedData.authTag) {
      // 使用AES-GCM解密
      const encryptionKey = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key';
      const algorithm = 'aes-256-gcm';
      
      const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // 创建decipher
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAAD(Buffer.from('MPC_SHARE', 'utf8'));
      decipher.setAuthTag(authTag);
      
      // 解密
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return BigInt(decrypted);
    } else {
      // 降级到base64解码
      return BigInt(Buffer.from(encryptedShare, 'base64').toString());
    }
  } catch (error) {
    console.error('Decryption error:', error);
    // 降级到base64解码
    return BigInt(Buffer.from(encryptedShare, 'base64').toString());
  }
}

// 测试函数
function testEncryption() {
  console.log('=== MPC份额加密测试 ===\n');
  
  // 测试数据
  const testShares = [
    BigInt('1234567890123456789012345678901234567890'),
    BigInt('9876543210987654321098765432109876543210'),
    BigInt('5555555555555555555555555555555555555555')
  ];
  
  testShares.forEach((share, index) => {
    console.log(`测试份额 ${index + 1}:`);
    console.log(`原始值: ${share.toString()}`);
    
    // 加密
    const encrypted = encryptShare(share);
    console.log(`加密后: ${encrypted.substring(0, 100)}...`);
    
    // 解密
    const decrypted = decryptShare(encrypted);
    console.log(`解密后: ${decrypted.toString()}`);
    
    // 验证
    const isValid = share === decrypted;
    console.log(`验证结果: ${isValid ? '✅ 成功' : '❌ 失败'}`);
    console.log('---\n');
  });
  
  // 测试错误处理
  console.log('=== 错误处理测试 ===\n');
  
  // 测试无效的加密数据
  try {
    const invalidData = 'invalid-json-data';
    const result = decryptShare(invalidData);
    console.log('无效数据解密结果:', result.toString());
  } catch (error) {
    console.log('无效数据处理:', error.message);
  }
  
  // 测试空数据
  try {
    const emptyData = '';
    const result = decryptShare(emptyData);
    console.log('空数据处理:', result.toString());
  } catch (error) {
    console.log('空数据错误:', error.message);
  }
}

// 运行测试
testEncryption(); 