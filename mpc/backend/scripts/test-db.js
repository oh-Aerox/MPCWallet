const mysql = require('mysql2/promise');
require('dotenv').config();

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'mpc_wallet',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

async function testDatabaseConnection() {
  let connection;
  
  try {
    console.log('🔍 测试数据库连接...');
    console.log(`📊 连接信息:`);
    console.log(`   - 主机: ${dbConfig.host}`);
    console.log(`   - 端口: ${dbConfig.port}`);
    console.log(`   - 用户: ${dbConfig.user}`);
    console.log(`   - 数据库: ${dbConfig.database}`);
    
    // 测试连接
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功！');
    
    // 测试查询
    const [rows] = await connection.execute('SELECT VERSION() as version');
    console.log(`📋 MySQL版本: ${rows[0].version}`);
    
    // 检查表是否存在
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME, TABLE_ROWS 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = '${dbConfig.database}'
      ORDER BY TABLE_NAME
    `);
    
    console.log(`📋 数据库中的表 (${tables.length} 个):`);
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME} (${table.TABLE_ROWS} 行)`);
    });
    
    // 检查用户数量
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 用户数量: ${users[0].count}`);
    
    // 检查钱包数量
    const [wallets] = await connection.execute('SELECT COUNT(*) as count FROM wallets');
    console.log(`💰 钱包数量: ${wallets[0].count}`);
    
    // 检查交易数量
    const [transactions] = await connection.execute('SELECT COUNT(*) as count FROM transactions');
    console.log(`💸 交易数量: ${transactions[0].count}`);
    
    console.log('\n🎉 数据库连接测试完成！');
    
  } catch (error) {
    console.error('❌ 数据库连接测试失败:', error.message);
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 提示: 请检查用户名和密码是否正确');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 提示: 请确保MySQL服务正在运行');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 提示: 数据库不存在，请先运行初始化脚本');
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  testDatabaseConnection();
}

module.exports = { testDatabaseConnection }; 