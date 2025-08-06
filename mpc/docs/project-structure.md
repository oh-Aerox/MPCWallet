# MPC钱包系统项目结构

## 项目概述

这是一个完整的MPC钱包系统，包含前端、后端、MPC核心算法和完整的文档。

## 目录结构

```
mpc-wallet/
├── README.md                    # 项目说明文档
├── package.json                 # 根项目配置
├── frontend/                    # 前端应用
│   ├── package.json            # 前端依赖配置
│   ├── public/                 # 静态资源
│   │   └── index.html         # HTML模板
│   └── src/                    # 源代码
│       ├── index.tsx           # 应用入口
│       ├── App.tsx             # 主应用组件
│       ├── index.css           # 全局样式
│       ├── types/              # TypeScript类型定义
│       │   └── index.ts       # 核心类型定义
│       └── pages/              # 页面组件
│           ├── Dashboard.tsx   # 仪表板页面
│           ├── WalletManagement.tsx  # 钱包管理页面
│           └── TransactionManagement.tsx  # 交易管理页面
├── backend/                     # 后端应用
│   ├── package.json            # 后端依赖配置
│   ├── env.example             # 环境变量示例
│   └── src/                    # 源代码
│       ├── index.js            # 服务器入口
│       ├── middleware/         # 中间件
│       │   ├── auth.js        # 身份验证中间件
│       │   └── validation.js  # 数据验证中间件
│       ├── routes/             # API路由
│       │   ├── auth.js        # 认证相关API
│       │   ├── wallets.js     # 钱包管理API
│       │   ├── transactions.js # 交易管理API
│       │   ├── users.js       # 用户管理API
│       │   ├── mpc.js         # MPC相关API
│       │   └── audit.js       # 审计日志API
│       └── utils/              # 工具函数
│           └── audit.js        # 审计日志工具
├── mpc-core/                    # MPC核心算法
│   ├── package.json            # MPC模块配置
│   └── src/                    # 源代码
│       ├── index.js            # 模块入口
│       └── shamir.js          # Shamir秘密共享算法
├── docs/                        # 文档
│   ├── system-design.md        # 系统设计文档
│   ├── api-documentation.md    # API文档
│   └── project-structure.md    # 项目结构说明
└── scripts/                     # 脚本文件
    └── start.sh                # 启动脚本
```

## 核心模块说明

### 前端模块 (frontend/)

**技术栈**: React + TypeScript + Ant Design

**主要功能**:
- 用户界面和交互
- 钱包管理界面
- 交易管理界面
- 实时状态更新
- 响应式设计

**关键文件**:
- `src/App.tsx`: 主应用组件，包含路由和布局
- `src/pages/Dashboard.tsx`: 仪表板页面，显示系统概览
- `src/pages/WalletManagement.tsx`: 钱包管理页面
- `src/pages/TransactionManagement.tsx`: 交易管理页面
- `src/types/index.ts`: TypeScript类型定义

### 后端模块 (backend/)

**技术栈**: Node.js + Express + Socket.io

**主要功能**:
- RESTful API服务
- WebSocket实时通信
- 身份验证和授权
- 数据验证和审计
- MPC协议集成

**关键文件**:
- `src/index.js`: 服务器入口，配置中间件和路由
- `src/middleware/auth.js`: JWT身份验证中间件
- `src/middleware/validation.js`: 数据验证中间件
- `src/routes/`: API路由模块
- `src/utils/audit.js`: 审计日志工具

### MPC核心模块 (mpc-core/)

**主要功能**:
- Shamir秘密共享算法实现
- 密钥分割和恢复
- 份额验证和管理
- 安全加密操作

**关键文件**:
- `src/shamir.js`: Shamir秘密共享算法实现
- `src/index.js`: 模块导出

## API路由结构

### 认证相关 (/api/auth)
- `POST /login`: 用户登录
- `POST /register`: 用户注册
- `POST /refresh`: 刷新令牌
- `POST /logout`: 用户登出

### 钱包管理 (/api/wallets)
- `GET /`: 获取钱包列表
- `POST /`: 创建钱包
- `GET /:id`: 获取钱包详情
- `PUT /:id`: 更新钱包
- `GET /:id/balance`: 获取钱包余额
- `POST /:id/refresh-shares`: 份额轮换

### 交易管理 (/api/transactions)
- `GET /`: 获取交易列表
- `POST /`: 创建交易
- `POST /:id/approve`: 审批交易
- `POST /:id/sign`: 签名交易
- `GET /stats`: 获取交易统计

### 用户管理 (/api/users)
- `GET /`: 获取用户列表
- `POST /`: 创建用户
- `PUT /:id`: 更新用户
- `DELETE /:id`: 删除用户
- `POST /:id/reset-password`: 重置密码

### MPC相关 (/api/mpc)
- `GET /config`: 获取MPC配置
- `POST /verify-shares`: 验证份额
- `POST /backup-shares`: 份额备份
- `POST /restore-shares`: 份额恢复
- `POST /generate-shares`: 生成新份额
- `POST /rotate-shares`: 份额轮换

### 审计日志 (/api/audit)
- `GET /logs`: 获取审计日志
- `GET /export`: 导出审计日志
- `GET /stats`: 获取审计统计
- `POST /cleanup`: 清理旧日志

## 数据模型

### 用户模型 (User)
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  organization: string;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date;
}
```

### 钱包模型 (Wallet)
```typescript
interface Wallet {
  id: string;
  name: string;
  address: string;
  chain: Blockchain;
  threshold: number;
  totalShares: number;
  status: WalletStatus;
  balance: AssetBalance[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 交易模型 (Transaction)
```typescript
interface Transaction {
  id: string;
  walletId: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  symbol: string;
  status: TransactionStatus;
  type: TransactionType;
  signatures: Signature[];
  approvals: Approval[];
  createdAt: Date;
  updatedAt: Date;
}
```

## 安全特性

### 身份验证
- JWT令牌认证
- 基于角色的访问控制
- 令牌刷新机制

### 数据安全
- 输入验证和清理
- SQL注入防护
- XSS防护
- CSRF防护

### MPC安全
- Shamir秘密共享
- 份额加密存储
- 安全通信协议
- 审计日志记录

## 部署说明

### 开发环境
1. 安装依赖: `npm run install:all`
2. 启动后端: `cd backend && npm run dev`
3. 启动前端: `cd frontend && npm start`

### 生产环境
1. 配置环境变量
2. 构建前端: `cd frontend && npm run build`
3. 启动后端: `cd backend && npm start`

## 监控和维护

### 健康检查
- 端点: `GET /health`
- 检查服务状态和依赖

### 日志管理
- 审计日志记录所有关键操作
- 支持日志导出和清理
- 实时日志监控

### 性能监控
- API响应时间监控
- 错误率统计
- 资源使用情况

这个项目结构提供了完整的MPC钱包解决方案，具有良好的可扩展性和维护性。 