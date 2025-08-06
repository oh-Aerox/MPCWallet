#!/bin/bash

# MPC钱包系统启动脚本

echo "🚀 启动MPC钱包系统..."

# 检查Node.js版本
echo "📋 检查Node.js版本..."
node --version
npm --version

# 安装依赖
echo "📦 安装项目依赖..."
npm run install:all

# 启动后端服务
echo "🔧 启动后端服务..."
cd backend
npm run dev &
BACKEND_PID=$!

# 等待后端启动
sleep 5

# 启动前端服务
echo "🎨 启动前端服务..."
cd ../frontend
npm start &
FRONTEND_PID=$!

# 等待用户中断
echo "✅ 系统启动完成！"
echo "📱 前端地址: http://localhost:3000"
echo "🔌 后端地址: http://localhost:3001"
echo "📊 健康检查: http://localhost:3001/health"
echo ""
echo "按 Ctrl+C 停止服务"

# 捕获中断信号
trap 'echo "🛑 正在停止服务..."; kill $BACKEND_PID $FRONTEND_PID; exit' INT

# 等待进程结束
wait 