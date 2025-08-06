# MPC Wallet 数据库设置指南

## 概述

本项目使用 MySQL 作为主数据库，支持完整的 MPC 钱包功能，包括用户管理、钱包管理、交易处理、审批流程和审计日志。

## 数据库要求

- **MySQL 版本**: 8.0 或更高版本
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci
- **存储引擎**: InnoDB

## 快速开始

### 1. 安装 MySQL

#### macOS (使用 Homebrew)
```bash
brew install mysql
brew services start mysql
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

#### Windows
下载并安装 [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)

### 2. 配置环境变量

复制环境配置文件：
```bash
cp env.example .env
```

编辑 `.env` 文件，设置数据库连接信息：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mpc_wallet
DB_USER=root
DB_PASSWORD=your_password
```

### 3. 初始化数据库

运行数据库初始化脚本：
```bash
npm run db:init
```

### 4. 测试数据库连接

验证数据库连接：
```bash
npm run db:test
```

## 数据库表结构

### 核心表

#### 1. users (用户表)
- 存储系统用户信息
- 支持多种角色：admin, operator, approver, viewer
- 包含用户状态管理和登录记录

#### 2. wallets (钱包表)
- 存储 MPC 钱包信息
- 支持多种区块链：bitcoin, ethereum, bsc, polygon
- 包含阈值设置和状态管理

#### 3. wallet_participants (钱包参与者表)
- 存储钱包参与者的密钥份额
- 支持备份和恢复功能
- 包含公钥和加密份额

#### 4. transactions (交易表)
- 存储所有交易记录
- 支持多种交易状态和类型
- 包含 gas 费用和交易哈希

#### 5. transaction_approvals (交易审批表)
- 存储交易审批记录
- 支持多级审批流程
- 包含审批意见和状态

#### 6. transaction_signatures (交易签名表)
- 存储 MPC 签名信息
- 支持分布式签名流程
- 包含签名验证数据

### 辅助表

#### 7. wallet_balances (钱包余额表)
- 存储钱包余额信息
- 支持多种代币
- 包含 USD 价值计算

#### 8. audit_logs (审计日志表)
- 存储系统操作日志
- 支持 JSON 格式的详细信息
- 包含 IP 地址和用户代理

#### 9. system_configs (系统配置表)
- 存储系统配置参数
- 支持动态配置更新
- 包含配置描述信息

## 数据库索引

为了提高查询性能，所有表都包含适当的索引：

- **主键索引**: 所有表都有 UUID 主键
- **外键索引**: 支持级联删除和更新
- **业务索引**: 用户名、邮箱、地址等常用查询字段
- **时间索引**: 创建时间和更新时间
- **状态索引**: 各种状态字段

## 数据完整性

### 外键约束
- 钱包参与者关联钱包和用户
- 交易关联钱包和创建者
- 审批和签名关联交易和用户
- 余额关联钱包
- 审计日志关联用户

### 唯一约束
- 用户名和邮箱唯一
- 钱包地址唯一
- 钱包参与者唯一
- 交易审批唯一
- 交易签名唯一
- 钱包余额唯一

## 性能优化

### 连接池配置
```javascript
{
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true
}
```

### 查询优化
- 使用参数化查询防止 SQL 注入
- 合理使用索引提高查询速度
- 分页查询避免大量数据加载

## 备份和恢复

### 备份数据库
```bash
mysqldump -u root -p mpc_wallet > backup.sql
```

### 恢复数据库
```bash
mysql -u root -p mpc_wallet < backup.sql
```

## 监控和维护

### 查看表大小
```sql
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024, 2) AS SIZE_KB
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'mpc_wallet'
ORDER BY SIZE_KB DESC;
```

### 查看慢查询
```sql
SHOW VARIABLES LIKE 'slow_query_log';
SHOW VARIABLES LIKE 'long_query_time';
```

## 故障排除

### 常见问题

1. **连接被拒绝**
   - 检查 MySQL 服务是否运行
   - 验证主机和端口配置

2. **访问被拒绝**
   - 检查用户名和密码
   - 确认用户权限

3. **数据库不存在**
   - 运行初始化脚本创建数据库
   - 检查数据库名称配置

4. **字符集问题**
   - 确保使用 utf8mb4 字符集
   - 检查排序规则设置

### 日志查看
```bash
# MySQL 错误日志
sudo tail -f /var/log/mysql/error.log

# 应用日志
npm run dev
```

## 安全建议

1. **密码安全**
   - 使用强密码
   - 定期更换密码
   - 避免使用默认密码

2. **用户权限**
   - 创建专用数据库用户
   - 限制用户权限
   - 定期审查用户权限

3. **网络安全**
   - 配置防火墙
   - 使用 SSL 连接
   - 限制远程访问

4. **数据加密**
   - 启用表空间加密
   - 加密敏感数据
   - 定期备份加密

## 开发环境

### 本地开发
```bash
# 启动开发服务器
npm run dev

# 测试数据库连接
npm run db:test

# 重置数据库
npm run db:reset
```

### 生产环境
```bash
# 启动生产服务器
npm start

# 监控数据库连接
npm run db:test
```

## 联系支持

如果遇到数据库相关问题，请：

1. 检查错误日志
2. 验证配置参数
3. 测试数据库连接
4. 查看系统资源使用情况
5. 联系技术支持团队 