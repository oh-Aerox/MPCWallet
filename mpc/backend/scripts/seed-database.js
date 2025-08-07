const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'mpc_wallet',
  charset: 'utf8mb4',
  timezone: '+00:00',
  multipleStatements: true
};

async function seedDatabase() {
  let connection;
  
  try {
    console.log('🌱 开始插入种子数据...');
    
    // 连接到数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 成功连接到数据库');
    
    // 读取SQL脚本
    const sqlPath = path.join(__dirname, 'seed-data.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 读取种子数据SQL文件...');
    
    // 执行SQL脚本
    await connection.execute(sqlContent);
    
    console.log('✅ 种子数据插入完成！');
    
    // 显示数据统计
    const [results] = await connection.execute(`
      SELECT 
        'users' as table_name, COUNT(*) as count FROM users
      UNION ALL
      SELECT 'wallets', COUNT(*) FROM wallets
      UNION ALL
      SELECT 'wallet_balances', COUNT(*) FROM wallet_balances
      UNION ALL
      SELECT 'wallet_participants', COUNT(*) FROM wallet_participants
      UNION ALL
      SELECT 'transactions', COUNT(*) FROM transactions
      UNION ALL
      SELECT 'transaction_approvals', COUNT(*) FROM transaction_approvals
      UNION ALL
      SELECT 'transaction_signatures', COUNT(*) FROM transaction_signatures
      UNION ALL
      SELECT 'audit_logs', COUNT(*) FROM audit_logs
    `);
    
    console.log('\n📊 数据统计:');
    results.forEach(row => {
      console.log(`   - ${row.table_name}: ${row.count} 条记录`);
    });
    
    console.log('\n🎉 种子数据插入成功！');
    console.log('💡 测试账户信息:');
    console.log('   - 管理员: admin@example.com / admin123');
    console.log('   - 操作员: operator@example.com / admin123');
    console.log('   - 审批员: approver@example.com / admin123');
    console.log('   - 查看员: viewer@example.com / admin123');
    
  } catch (error) {
    console.error('❌ 种子数据插入失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase }; 