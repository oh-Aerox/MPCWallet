const DKGWallet = require('../src/utils/dkg-wallet');
const EC = require('elliptic').ec;

// 初始化
const dkgWallet = new DKGWallet();
const ec = new EC('secp256k1');

console.log('=== DKG钱包创建测试 ===\n');

// 测试参数
const participants = ['user1', 'user2', 'user3', 'user4', 'user5'];
const threshold = 3;

console.log(`参与者: ${participants.join(', ')}`);
console.log(`阈值: ${threshold}`);
console.log(`总参与者数: ${participants.length}\n`);

// 创建DKG钱包
async function testDKGWallet() {
  try {
    console.log('开始创建DKG钱包...\n');
    
    const result = await dkgWallet.createDKGWallet(participants, threshold);
    
    if (result.success) {
      console.log('✅ DKG钱包创建成功!\n');
      
      console.log('钱包信息:');
      console.log(`  地址: ${result.wallet.address}`);
      console.log(`  公钥: ${result.wallet.publicKey}`);
      console.log(`  阈值: ${result.wallet.threshold}`);
      console.log(`  总参与者: ${result.wallet.totalParticipants}`);
      console.log(`  参与者: ${result.wallet.participants.join(', ')}\n`);
      
      console.log('参与者数据:');
      for (const [participantId, data] of result.participantData) {
        console.log(`  ${participantId}:`);
        console.log(`    承诺值数量: ${data.commitments.length}`);
        console.log(`    份额数量: ${data.shares.length}`);
        console.log(`    第一个承诺值: ${data.commitments[0]?.substring(0, 20)}...`);
        console.log(`    第一个份额: (${data.shares[0]?.x}, ${data.shares[0]?.y?.substring(0, 20)}...)\n`);
      }
      
      // 验证生成的地址
      console.log('验证生成的地址:');
      const key = ec.keyFromPrivate(result.wallet.secret, 'hex');
      const publicKey = key.getPublic(false, 'hex').slice(2);
      const address = require('keccak')('keccak256').update(Buffer.from(publicKey, 'hex')).digest('hex').slice(-40);
      
      console.log(`  计算的公钥: ${publicKey}`);
      console.log(`  计算的地址: 0x${address}`);
      console.log(`  匹配结果: ${result.wallet.publicKey === publicKey ? '✅ 公钥匹配' : '❌ 公钥不匹配'}`);
      console.log(`  地址匹配: ${result.wallet.address === '0x' + address ? '✅ 地址匹配' : '❌ 地址不匹配'}\n`);
      
    } else {
      console.log('❌ DKG钱包创建失败:');
      console.log(`   错误: ${result.error}\n`);
    }
    
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 对比传统方法
function compareWithTraditional() {
  console.log('=== 对比传统方法 ===\n');
  
  // 传统方法：先生成私钥再分割
  console.log('传统方法:');
  const key = ec.genKeyPair();
  const privateKey = key.getPrivate('hex');
  const publicKey = key.getPublic(false, 'hex').slice(2);
  const address = require('keccak')('keccak256').update(Buffer.from(publicKey, 'hex')).digest('hex').slice(-40);
  
  console.log(`  1. 生成完整私钥: ${privateKey}`);
  console.log(`  2. 生成公钥: ${publicKey}`);
  console.log(`  3. 生成地址: 0x${address}`);
  console.log(`  4. 使用Shamir分割私钥为份额`);
  console.log(`  5. 分发份额给参与者\n`);
  
  console.log('DKG方法:');
  console.log(`  1. 每个参与者独立生成随机多项式`);
  console.log(`  2. 计算承诺值并广播`);
  console.log(`  3. 验证承诺值`);
  console.log(`  4. 组合份额生成最终密钥`);
  console.log(`  5. 从未生成完整私钥\n`);
  
  console.log('优势对比:');
  console.log('  传统方法:');
  console.log('    ❌ 需要先生成完整私钥');
  console.log('    ❌ 存在单点故障风险');
  console.log('    ❌ 需要可信的密钥生成器');
  console.log('    ✅ 实现简单');
  console.log('    ✅ 计算效率高\n');
  
  console.log('  DKG方法:');
  console.log('    ✅ 真正的分布式密钥生成');
  console.log('    ✅ 无单点故障');
  console.log('    ✅ 无需可信第三方');
  console.log('    ✅ 更高的安全性');
  console.log('    ❌ 实现复杂');
  console.log('    ❌ 计算开销较大\n');
}

// 运行测试
testDKGWallet().then(() => {
  compareWithTraditional();
  console.log('=== 测试完成 ===');
}); 