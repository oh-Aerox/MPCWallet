const crypto = require('crypto');
const secp256k1 = require('secp256k1');
const keccak = require('keccak');

// 测试钱包地址生成
function testWalletAddressGeneration() {
  console.log('=== 测试钱包地址生成 ===\n');

  // 生成私钥（使用随机字节）
  const randomPrivateKey = crypto.randomBytes(32);
  console.log('随机私钥:', '0x' + randomPrivateKey.toString('hex'));

  // 生成公钥
  const secpPublicKey = secp256k1.publicKeyCreate(randomPrivateKey, false);
  const publicKeyHex = '0x' + secpPublicKey.toString('hex');
  console.log('secp256k1公钥:', publicKeyHex);

  const address1 = keccak('keccak256').update(publicKeyHex.slice(-64)).digest('hex').slice(-40);
console.log('Wallet Address: 0x' + address1);

  // 生成地址
  const pubKeyHex = publicKeyHex.replace('0x', '');
  const hash = keccak('keccak256').update(Buffer.from(pubKeyHex, 'hex')).digest();
  const address = '0x' + hash.slice(-20).toString('hex');
  console.log('地址:', address);

  // 验证地址格式
  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(address);
  console.log('地址格式有效:', isValidAddress);

  // 测试签名验证
  const message = Buffer.from('Hello, MPC Wallet!');
  const messageHash = keccak('keccak256').update(message).digest();
  
  try {
    // 使用正确的签名API
    const signature = secp256k1.ecdsaSign(messageHash, randomPrivateKey);
    console.log('签名:', signature.signature.toString('hex'));
    
    // 验证签名
    const isValid = secp256k1.ecdsaVerify(messageHash, signature.signature, secpPublicKey);
    console.log('签名验证:', isValid);
  } catch (error) {
    console.log('签名验证失败:', error.message);
  }

  console.log('\n=== 测试完成 ===');
}

// 运行测试
testWalletAddressGeneration();

