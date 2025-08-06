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
  charset: 'utf8mb4',
  timezone: '+00:00'
};

async function initDatabase() {
  let connection;
  
  try {
    console.log('🔧 开始初始化数据库...');
    
    // 连接到MySQL服务器（不指定数据库）
    connection = await mysql.createConnection({
      ...dbConfig,
      multipleStatements: true
    });
    
    console.log('✅ 成功连接到MySQL服务器');
    
    // 读取SQL脚本
    const sqlPath = path.join(__dirname, 'init-database.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 读取SQL脚本文件...');
    
    // 执行SQL脚本
    await connection.execute(sqlContent);
    
    console.log('✅ 数据库初始化完成！');
    console.log('📊 数据库信息:');
    console.log(`   - 数据库名: ${process.env.DB_NAME || 'mpc_wallet'}`);
    console.log(`   - 主机: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   - 端口: ${process.env.DB_PORT || 3306}`);
    console.log(`   - 用户: ${process.env.DB_USER || 'root'}`);
    
    // 显示表信息
    const [tables] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        TABLE_ROWS,
        ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS SIZE_KB
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = '${process.env.DB_NAME || 'mpc_wallet'}'
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n📋 创建的表:');
    tables.forEach(table => {
      console.log(`   - ${table.TABLE_NAME} (${table.TABLE_ROWS} 行, ${table.SIZE_KB} KB)`);
    });
    
    console.log('\n🎉 数据库初始化成功！');
    console.log('💡 默认管理员账户:');
    console.log('   - 用户名: admin');
    console.log('   - 邮箱: admin@mpcwallet.com');
    console.log('   - 密码: admin123 (请在生产环境中修改)');
    
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase }; 