# 数据库集成指南

## 概述

本项目已成功将模拟数据迁移到 MySQL 数据库，实现了真实的数据持久化。

## 完成的工作

### 1. 数据库种子数据

#### ✅ 创建了种子数据 SQL 文件
- **文件**: `backend/scripts/seed-data.sql`
- **包含数据**:
  - 4 个用户（管理员、操作员、审批员、查看员）
  - 4 个钱包（主钱包、备用钱包、BTC钱包、BSC钱包）
  - 6 个钱包余额记录
  - 8 个钱包参与者记录
  - 4 个交易记录
  - 8 个交易审批记录
  - 7 个交易签名记录
  - 5 个审计日志记录

#### ✅ 创建了种子数据执行脚本
- **文件**: `backend/scripts/seed-database.js`
- **功能**: 自动化执行种子数据插入
- **特性**: 错误处理、数据统计、状态反馈

### 2. 后端 API 更新

#### ✅ 创建了数据获取 API
- **文件**: `backend/src/routes/data.js`
- **API 端点**:
  - `GET /api/data/users` - 获取所有用户
  - `GET /api/data/wallets` - 获取所有钱包（包含余额）
  - `GET /api/data/transactions` - 获取所有交易（包含审批和签名）
  - `GET /api/data/current-user` - 获取当前用户信息
  - `GET /api/data/dashboard-stats` - 获取仪表板统计数据

#### ✅ 更新了主入口文件
- **文件**: `backend/src/index.js`
- **添加**: 数据路由 `/api/data`

### 3. 前端应用更新

#### ✅ 移除了模拟数据
- **文件**: `frontend/src/App.tsx`
- **更改**: 完全移除模拟数据，使用真实 API 调用

#### ✅ 实现了数据获取功能
- **功能**:
  - `fetchCurrentUser()` - 获取当前用户
  - `fetchUsers()` - 获取所有用户
  - `fetchWallets()` - 获取所有钱包
  - `fetchTransactions()` - 获取所有交易

#### ✅ 实现了数据操作功能
- **功能**:
  - `handleCreateWallet()` - 创建钱包
  - `handleCreateTransaction()` - 创建交易
  - `handleApproveTransaction()` - 审批交易
  - `handleSignTransaction()` - 签名交易

### 4. 数据流程

#### 应用启动流程
1. **初始化**: 应用启动时显示加载状态
2. **并行获取**: 同时获取用户、钱包、交易数据
3. **状态更新**: 数据获取完成后更新组件状态
4. **渲染界面**: 显示真实数据

#### 数据操作流程
1. **用户操作**: 用户在前端进行操作
2. **API 调用**: 前端调用后端 API
3. **数据库操作**: 后端执行数据库操作
4. **数据刷新**: 重新获取最新数据
5. **界面更新**: 更新前端界面

## 使用方法

### 1. 初始化数据库

```bash
# 进入后端目录
cd backend

# 初始化数据库表
npm run db:init

# 插入种子数据
npm run db:seed

# 测试数据库连接
npm run db:test
```

### 2. 启动应用

```bash
# 启动后端
cd backend
npm run dev

# 启动前端（新终端）
cd frontend
npm start
```

### 3. 访问应用

- **前端**: http://localhost:3000
- **后端 API**: http://localhost:3001

### 4. 测试账户

```
管理员: admin@example.com / admin123
操作员: operator@example.com / admin123
审批员: approver@example.com / admin123
查看员: viewer@example.com / admin123
```

## 数据结构

### 用户数据
```sql
-- 用户表结构
users (
  id, username, email, password, role, organization, 
  status, created_at, updated_at, last_login_at
)
```

### 钱包数据
```sql
-- 钱包表结构
wallets (
  id, name, address, chain, threshold, total_shares, 
  status, created_at, updated_at
)

-- 钱包余额表结构
wallet_balances (
  id, wallet_id, symbol, balance, decimals, usd_value, updated_at
)
```

### 交易数据
```sql
-- 交易表结构
transactions (
  id, wallet_id, tx_hash, from_address, to_address, amount, symbol,
  gas_limit, gas_price, status, type, created_by, created_at, updated_at
)

-- 交易审批表结构
transaction_approvals (
  id, transaction_id, user_id, approved, comment, created_at
)

-- 交易签名表结构
transaction_signatures (
  id, transaction_id, user_id, signature, created_at
)
```

## API 接口

### 数据获取接口

#### 获取所有用户
```http
GET /api/data/users
Authorization: Bearer <token>
```

#### 获取所有钱包
```http
GET /api/data/wallets
Authorization: Bearer <token>
```

#### 获取所有交易
```http
GET /api/data/transactions
Authorization: Bearer <token>
```

#### 获取当前用户
```http
GET /api/data/current-user
Authorization: Bearer <token>
```

#### 获取仪表板统计
```http
GET /api/data/dashboard-stats
Authorization: Bearer <token>
```

### 响应格式

```json
{
  "success": true,
  "data": [...],
  "error": null
}
```

## 错误处理

### 前端错误处理
- **网络错误**: 显示错误信息
- **API 错误**: 显示服务器错误信息
- **数据错误**: 显示数据加载失败信息

### 后端错误处理
- **数据库错误**: 记录错误日志，返回错误信息
- **验证错误**: 返回详细的验证错误信息
- **权限错误**: 返回权限不足信息

## 性能优化

### 数据库优化
- **索引**: 为常用查询字段添加索引
- **连接池**: 使用连接池管理数据库连接
- **查询优化**: 使用 JOIN 查询减少数据库请求

### 前端优化
- **并行请求**: 同时获取多个数据源
- **缓存**: 缓存用户认证信息
- **错误重试**: 自动重试失败的请求

## 监控和日志

### 数据库监控
- **连接状态**: 监控数据库连接状态
- **查询性能**: 监控慢查询
- **数据统计**: 定期统计数据量

### 应用监控
- **API 性能**: 监控 API 响应时间
- **错误率**: 监控错误发生率
- **用户行为**: 记录用户操作日志

## 下一步计划

### 1. 数据同步
- 实现实时数据同步
- 添加 WebSocket 支持
- 实现数据变更通知

### 2. 数据验证
- 添加数据完整性检查
- 实现数据备份和恢复
- 添加数据迁移工具

### 3. 性能优化
- 实现数据分页
- 添加数据缓存
- 优化查询性能

## 总结

✅ **数据库集成完成**
- 从模拟数据迁移到真实数据库
- 实现了完整的数据 CRUD 操作
- 添加了数据验证和错误处理

✅ **API 接口完善**
- 创建了完整的数据获取 API
- 实现了数据操作 API
- 添加了权限验证

✅ **前端应用更新**
- 移除了所有模拟数据
- 实现了真实的数据获取和操作
- 添加了加载状态和错误处理

项目现在使用真实的 MySQL 数据库，可以进行生产环境部署！ 