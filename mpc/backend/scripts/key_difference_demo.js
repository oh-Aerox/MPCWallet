const EC = require('elliptic').ec;
const crypto = require('crypto');
const keccak = require('keccak');

// 初始化椭圆曲线
const ec = new EC('secp256k1');

console.log('=== 钱包私钥 vs 加密密钥 演示 ===\n');

// 1. 生成钱包私钥 (用于生成地址)
console.log('1. 钱包私钥 (Wallet Private Key):');
const key = ec.genKeyPair();
const walletPrivateKey = key.getPrivate('hex');
const walletPublicKey = key.getPublic(false, 'hex').slice(2);
const walletAddress = keccak('keccak256').update(Buffer.from(walletPublicKey, 'hex')).digest('hex').slice(-40);

console.log(`   私钥: ${walletPrivateKey}`);
console.log(`   公钥: ${walletPublicKey}`);
console.log(`   地址: 0x${walletAddress}`);
console.log(`   长度: ${walletPrivateKey.length} 字符 (256位)`);
console.log(`   用途: 生成钱包地址和签名交易\n`);

// 2. 加密密钥 (用于加密份额)
console.log('2. 加密密钥 (Encryption Key):');
const encryptionKey = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key';
console.log(`   密钥: ${encryptionKey}`);
console.log(`   长度: ${encryptionKey.length} 字符`);
console.log(`   用途: 加密/解密MPC份额\n`);

// 3. 演示MPC份额加密过程
console.log('3. MPC份额加密过程:');

// 模拟一个MPC份额
const mpcShare = BigInt('1234567890123456789012345678901234567890');
console.log(`   原始份额: ${mpcShare.toString()}`);

// 使用加密密钥加密份额
function encryptShare(share) {
  const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from('MPC_SHARE', 'utf8'));
  
  const shareBuffer = Buffer.from(share.toString(), 'utf8');
  let encrypted = cipher.update(shareBuffer, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return JSON.stringify({
    iv: iv.toString('hex'),
    encrypted: encrypted,
    authTag: authTag.toString('hex')
  });
}

const encryptedShare = encryptShare(mpcShare);
console.log(`   加密后: ${encryptedShare.substring(0, 100)}...`);
console.log(`   使用密钥: ${encryptionKey}\n`);

// 4. 总结区别
console.log('4. 主要区别:');
console.log('   ┌─────────────────┬─────────────────┬─────────────────┐');
console.log('   │     类型        │     钱包私钥     │    加密密钥     │');
console.log('   ├─────────────────┼─────────────────┼─────────────────┤');
console.log('   │     用途        │  生成钱包地址    │  加密MPC份额    │');
console.log('   │     生成方式    │  椭圆曲线随机    │  环境变量配置    │');
console.log('   │     存储位置    │  内存/安全存储   │  环境变量/配置   │');
console.log('   │     生命周期    │  钱包创建时生成  │  系统配置时设置  │');
console.log('   │     安全要求    │  最高级别保护    │  系统级别保护    │');
console.log('   └─────────────────┴─────────────────┴─────────────────┘\n');

// 5. 安全建议
console.log('5. 安全建议:');
console.log('   • 钱包私钥: 永远不要明文存储，使用硬件钱包或安全模块');
console.log('   • 加密密钥: 使用强随机密钥，定期轮换');
console.log('   • 环境变量: 在生产环境中使用真实的强密钥');
console.log('   • 密钥管理: 考虑使用密钥管理服务 (KMS)'); 