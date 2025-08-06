#!/bin/bash

# MPC Wallet 数据库设置脚本

echo "🔧 MPC Wallet 数据库设置脚本"
echo "================================"

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 请在项目根目录运行此脚本"
    exit 1
fi

# 检查MySQL是否安装
if ! command -v mysql &> /dev/null; then
    echo "❌ MySQL 未安装"
    echo "💡 请先安装 MySQL:"
    echo "   macOS: brew install mysql"
    echo "   Ubuntu: sudo apt install mysql-server"
    echo "   Windows: 下载 MySQL Community Server"
    exit 1
fi

# 检查MySQL服务是否运行
if ! mysqladmin ping -h localhost -u root --password="" &> /dev/null; then
    echo "❌ MySQL 服务未运行"
    echo "💡 请启动 MySQL 服务:"
    echo "   macOS: brew services start mysql"
    echo "   Ubuntu: sudo systemctl start mysql"
    exit 1
fi

echo "✅ MySQL 服务正在运行"

# 进入后端目录
cd backend

# 检查环境配置文件
if [ ! -f ".env" ]; then
    echo "📝 创建环境配置文件..."
    cp env.example .env
    echo "✅ 环境配置文件已创建"
    echo "💡 请编辑 .env 文件设置数据库连接信息"
else
    echo "✅ 环境配置文件已存在"
fi

# 安装依赖
echo "📦 安装依赖..."
npm install

# 初始化数据库
echo "🗄️  初始化数据库..."
npm run db:init

# 测试数据库连接
echo "🔍 测试数据库连接..."
npm run db:test

echo ""
echo "🎉 数据库设置完成！"
echo "================================"
echo "📊 数据库信息:"
echo "   - 数据库名: mpc_wallet"
echo "   - 主机: localhost"
echo "   - 端口: 3306"
echo ""
echo "👤 默认管理员账户:"
echo "   - 用户名: admin"
echo "   - 邮箱: admin@mpcwallet.com"
echo "   - 密码: admin123"
echo ""
echo "🚀 启动应用:"
echo "   npm run dev"
echo ""
echo "📚 更多信息请查看: backend/README-DATABASE.md" 