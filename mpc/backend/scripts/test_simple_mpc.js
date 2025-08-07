const SimpleMPCSignature = require('../src/utils/mpc-signature-simple');
const { ShamirSecretSharing } = require('../../mpc-core/src/index');
const EC = require('elliptic').ec;
const keccak = require('keccak');

// 初始化
const mpcSignature = new SimpleMPCSignature();
const shamir = new ShamirSecretSharing();
const ec = new EC('secp256k1');

console.log('=== 简化MPC签名测试 ===\n');

// 1. 生成测试私钥和份额
console.log('1. 生成测试数据:');
const key = ec.genKeyPair();
const privateKey = key.getPrivate('hex');
const publicKey = key.getPublic(false, 'hex').slice(2);
const address = keccak('keccak256').update(Buffer.from(publicKey, 'hex')).digest('hex').slice(-40);

console.log(`   私钥: ${privateKey}`);
console.log(`   公钥: ${publicKey}`);
console.log(`   地址: 0x${address}\n`);

// 2. 分割私钥为份额
console.log('2. 分割私钥为份额:');
const privateKeyBigInt = BigInt('0x' + privateKey);
const shares = shamir.split(privateKeyBigInt, 3, 2); // 3个份额，阈值2

shares.forEach((share, index) => {
  console.log(`   份额 ${index + 1}: (${share.x}, ${share.y})`);
});
console.log('');

// 3. 创建测试交易
console.log('3. 创建测试交易:');
const transaction = {
  to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  value: '1000000000000000000', // 1 ETH
  gas: '21000',
  gasPrice: '20000000000',
  nonce: '0',
  data: ''
};

console.log(`   交易: ${JSON.stringify(transaction, null, 2)}\n`);

// 4. 生成消息哈希
console.log('4. 生成消息哈希:');
const messageHash = mpcSignature.generateMessageHash(transaction);
console.log(`   消息哈希: 0x${messageHash.toString('hex')}\n`);

// 5. 生成部分签名
console.log('5. 生成部分签名:');
const partialSignatures = [];

shares.slice(0, 2).forEach((share, index) => {
  try {
    const partialSig = mpcSignature.generatePartialSignature(
      share.y,
      messageHash,
      share.index
    );
    
    console.log(`   部分签名 ${index + 1}:`);
    console.log(`     r: ${partialSig.r}`);
    console.log(`     s: ${partialSig.s}`);
    console.log(`     v: ${partialSig.v}`);
    console.log(`     份额索引: ${partialSig.shareIndex}`);
    console.log(`     公钥: ${partialSig.publicKey}`);
    
    // 验证部分签名
    const isValid = mpcSignature.verifyPartialSignature(
      partialSig,
      messageHash,
      partialSig.publicKey
    );
    console.log(`     验证结果: ${isValid ? '✅ 有效' : '❌ 无效'}\n`);
    
    partialSignatures.push(partialSig);
  } catch (error) {
    console.error(`   部分签名 ${index + 1} 生成失败:`, error.message);
  }
});

// 6. 组合签名
console.log('6. 组合部分签名:');
try {
  const completeSignature = mpcSignature.combineSignaturesSimple(
    partialSignatures,
    messageHash
  );
  
  console.log(`   完整签名:`);
  console.log(`     r: ${completeSignature.r}`);
  console.log(`     s: ${completeSignature.s}`);
  console.log(`     v: ${completeSignature.v}`);
  console.log(`     签名: ${completeSignature.signature}`);
  console.log(`     方法: ${completeSignature.method}\n`);
  
  // 7. 验证完整签名
  console.log('7. 验证完整签名:');
  const isValidComplete = mpcSignature.verifySignature(
    completeSignature,
    messageHash,
    publicKey
  );
  
  console.log(`   验证结果: ${isValidComplete ? '✅ 有效' : '❌ 无效'}\n`);
  
  // 8. 对比传统签名
  console.log('8. 对比传统签名:');
  const traditionalSignature = key.sign(messageHash);
  console.log(`   传统签名:`);
  console.log(`     r: ${traditionalSignature.r.toString('hex')}`);
  console.log(`     s: ${traditionalSignature.s.toString('hex')}`);
  console.log(`     v: ${traditionalSignature.recoveryParam}`);
  
  const traditionalSigHex = '0x' + 
    traditionalSignature.r.toString('hex').padStart(64, '0') + 
    traditionalSignature.s.toString('hex').padStart(64, '0');
  console.log(`     签名: ${traditionalSigHex}\n`);
  
  // 验证传统签名
  const isValidTraditional = key.verify(messageHash, traditionalSignature);
  console.log(`   传统签名验证: ${isValidTraditional ? '✅ 有效' : '❌ 无效'}\n`);
  
} catch (error) {
  console.error('组合签名失败:', error.message);
}

// 9. 测试错误情况
console.log('9. 测试错误情况:');
try {
  // 测试不足的签名
  const insufficientSignatures = mpcSignature.combineSignaturesSimple(
    [], // 空数组
    messageHash
  );
} catch (error) {
  console.log(`   不足签名测试: ${error.message}`);
}

console.log('\n=== 测试完成 ==='); 