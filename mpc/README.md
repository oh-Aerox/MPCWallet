# MPC钱包系统

## 项目概述

这是一个基于多方计算（MPC）技术的加密货币钱包系统，提供安全的数字资产管理解决方案。

## 核心功能

### 1. 钱包管理
- 分布式密钥生成和管理
- 多签名交易支持
- 资产余额查询
- 交易历史记录

### 2. 安全机制
- 门限签名（t-of-n）
- 份额备份和恢复
- 安全审计日志
- 异常检测和告警

### 3. 用户管理
- 多角色权限控制
- 组织架构管理
- 操作审批流程
- 合规性检查

### 4. 交易功能
- 多链支持（BTC、ETH、BSC等）
- 批量交易处理
- 交易模板管理
- 实时交易状态

## 技术架构

### 前端技术栈
- React + TypeScript
- Ant Design UI组件库
- Web3.js 区块链交互
- Socket.io 实时通信

### 后端技术栈
- Node.js + Express
- PostgreSQL 数据库
- Redis 缓存
- MPC协议实现

### 安全组件
- 硬件安全模块（HSM）
- 加密通信协议
- 审计日志系统
- 监控告警系统

## 项目结构

```
mpc-wallet/
├── frontend/          # 前端应用
├── backend/           # 后端服务
├── mpc-core/          # MPC核心算法
├── docs/             # 文档
└── scripts/          # 部署脚本
```

## 快速开始

### 选项 1: 本地开发环境

1. **克隆项目**
```bash
git clone <repository-url>
cd mpc
```

2. **设置数据库**
```bash
# 运行自动设置脚本
./scripts/setup-database.sh
```

3. **启动应用**
```bash
# 启动后端
cd backend
npm run dev

# 启动前端 (新终端)
cd frontend
npm start
```

4. **访问应用**
```
http://localhost:3000
```

### 选项 2: 生产环境部署

1. **设置数据库**
```bash
./scripts/setup-database.sh
```

2. **构建和启动应用**
```bash
# 构建后端
cd backend
npm install
npm run build
npm start

# 构建前端 (新终端)
cd frontend
npm install
npm run build
# 使用 Nginx 或其他 Web 服务器部署
```

3. **访问应用**
```
http://localhost:3000
```

### 数据库配置

项目使用 MySQL 数据库。详细配置请参考：
- [数据库设置指南](backend/README-DATABASE.md)
- [部署指南](DEPLOYMENT.md)

**默认管理员账户:**
- 用户名: admin
- 邮箱: admin@mpcwallet.com
- 密码: admin123 (请在生产环境中修改)

## 安全说明

- 所有私钥份额都经过加密存储
- 通信使用TLS加密
- 支持硬件安全模块集成
- 完整的审计日志记录 