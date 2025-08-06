# MPC Wallet 部署指南

## 概述

本指南将帮助您部署 MPC Wallet 系统，包括数据库设置、应用部署和配置管理。

## 部署选项

### 选项 1: 本地开发环境

#### 前提条件
- Node.js 18+
- MySQL 8.0+
- Redis (可选)

#### 快速开始

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

### 选项 2: 生产环境部署

#### 前提条件
- Node.js 18+
- MySQL 8.0+
- Nginx (可选)

#### 快速开始

1. **克隆项目**
```bash
git clone <repository-url>
cd mpc
```

2. **设置数据库**
```bash
./scripts/setup-database.sh
```

3. **构建应用**
```bash
# 构建后端
cd backend
npm install
npm run build

# 构建前端
cd ../frontend
npm install
npm run build
```

4. **启动服务**
```bash
# 启动后端
cd backend
npm start

# 配置前端 (使用 Nginx 或其他 Web 服务器)
```

## 数据库配置

### MySQL 设置

#### 1. 安装 MySQL

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
```

**Windows:**
下载并安装 [MySQL Community Server](https://dev.mysql.com/downloads/mysql/)

#### 2. 配置数据库

创建数据库和用户：
```sql
CREATE DATABASE mpc_wallet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'mpc_user'@'localhost' IDENTIFIED BY 'mpc_password';
GRANT ALL PRIVILEGES ON mpc_wallet.* TO 'mpc_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 3. 初始化数据库

```bash
cd backend
npm run db:init
npm run db:test
```

### 环境变量配置

复制并编辑环境配置文件：
```bash
cd backend
cp env.example .env
```

编辑 `.env` 文件：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mpc_wallet
DB_USER=mpc_user
DB_PASSWORD=mpc_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT配置
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# 其他配置...
```

## 应用部署

### 后端部署

#### 1. 安装依赖
```bash
cd backend
npm install
```

#### 2. 构建应用
```bash
npm run build
```

#### 3. 启动服务
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 前端部署

#### 1. 安装依赖
```bash
cd frontend
npm install
```

#### 2. 构建应用
```bash
npm run build
```

#### 3. 部署到 Web 服务器

**Nginx 配置示例:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/frontend/build;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 生产环境配置

### 安全配置

1. **数据库安全**
   - 使用强密码
   - 限制数据库访问
   - 启用 SSL 连接

2. **应用安全**
   - 使用 HTTPS
   - 配置 CORS
   - 启用速率限制

3. **环境变量**
   - 使用强密钥
   - 定期轮换密钥
   - 保护敏感信息

### 性能优化

1. **数据库优化**
   - 配置连接池
   - 优化查询
   - 定期维护

2. **应用优化**
   - 启用压缩
   - 配置缓存
   - 负载均衡

### 监控和日志

1. **应用监控**
   - 健康检查
   - 性能监控
   - 错误追踪

2. **日志管理**
   - 结构化日志
   - 日志轮转
   - 日志分析

## 备份和恢复

### 数据库备份

```bash
# 创建备份
mysqldump -u mpc_user -p mpc_wallet > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
mysql -u mpc_user -p mpc_wallet < backup.sql
```

### 应用备份

```bash
# 备份配置文件
tar -czf config_backup_$(date +%Y%m%d_%H%M%S).tar.gz backend/.env frontend/.env

# 备份数据目录
tar -czf data_backup_$(date +%Y%m%d_%H%M%S).tar.gz uploads/ logs/
```

## 故障排除

### 常见问题

1. **数据库连接失败**
   - 检查 MySQL 服务状态
   - 验证连接参数
   - 检查防火墙设置

2. **应用启动失败**
   - 检查端口占用
   - 验证环境变量
   - 查看错误日志

3. **前端无法访问后端**
   - 检查 CORS 配置
   - 验证 API 地址
   - 检查网络连接

### 日志查看

```bash
# 应用日志
tail -f backend/logs/app.log

# 数据库日志
sudo tail -f /var/log/mysql/error.log

# 系统日志
journalctl -u your-app-service -f
```

## 更新和维护

### 应用更新

1. **代码更新**
```bash
git pull origin main
npm install
npm run build
```

2. **数据库迁移**
```bash
npm run db:migrate
```

3. **重启服务**
```bash
# 本地部署
pm2 restart all

# 系统服务重启
sudo systemctl restart your-app-service
```

### 定期维护

1. **数据库维护**
   - 定期备份
   - 清理日志
   - 优化表结构

2. **应用维护**
   - 更新依赖
   - 清理缓存
   - 监控资源使用

## 联系支持

如果遇到部署问题，请：

1. 查看错误日志
2. 检查配置参数
3. 验证系统要求
4. 联系技术支持

---

**注意**: 在生产环境中部署前，请确保：
- 所有密码都已更改
- 安全配置已正确设置
- 备份策略已实施
- 监控系统已配置 