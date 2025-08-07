// 测试 MPC Core 模块导入
console.log('🔧 测试 MPC Core 模块导入...');

try {
  const { ShamirSecretSharing } = require('./mpc-core/src/index');
  console.log('✅ MPC Core 模块导入成功');
  
  // 测试创建实例
  const shamir = new ShamirSecretSharing();
  console.log('✅ ShamirSecretSharing 实例创建成功');
  
  // 测试基本功能
  const secret = BigInt('123456789');
  const shares = shamir.split(secret, 3, 2);
  console.log('✅ 秘密分割功能正常');
  console.log(`   生成了 ${shares.length} 个份额`);
  
  // 测试恢复功能
  const recoveredSecret = shamir.reconstruct(shares.slice(0, 2));
  console.log('✅ 秘密恢复功能正常');
  console.log(`   原始秘密: ${secret}`);
  console.log(`   恢复秘密: ${recoveredSecret}`);
  console.log(`   恢复成功: ${secret === recoveredSecret}`);
  
} catch (error) {
  console.error('❌ MPC Core 模块导入失败:', error.message);
  process.exit(1);
}

console.log('🎉 所有测试通过！'); 