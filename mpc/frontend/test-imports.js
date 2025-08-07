// 测试模块导入
console.log('🔧 测试前端模块导入...');

try {
  // 测试页面组件导入
  const Dashboard = require('./src/pages/Dashboard').default;
  console.log('✅ Dashboard 组件导入成功');
  
  const WalletManagement = require('./src/pages/WalletManagement').default;
  console.log('✅ WalletManagement 组件导入成功');
  
  const TransactionManagement = require('./src/pages/TransactionManagement').default;
  console.log('✅ TransactionManagement 组件导入成功');
  
  // 测试类型导入
  const types = require('./src/types');
  console.log('✅ 类型定义导入成功');
  console.log('   可用类型:', Object.keys(types));
  
} catch (error) {
  console.error('❌ 模块导入失败:', error.message);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
}

console.log('🎉 所有模块导入测试通过！'); 