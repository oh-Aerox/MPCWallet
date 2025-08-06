-- MPC Wallet 数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS mpc_wallet
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE mpc_wallet;

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'operator', 'approver', 'viewer') NOT NULL DEFAULT 'operator',
  organization VARCHAR(100) NOT NULL,
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建钱包表
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  address VARCHAR(255) NOT NULL,
  chain ENUM('bitcoin', 'ethereum', 'bsc', 'polygon') NOT NULL,
  threshold INT NOT NULL,
  total_shares INT NOT NULL,
  status ENUM('active', 'inactive', 'pending', 'error') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_address (address),
  INDEX idx_chain (chain),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建钱包参与者关联表
CREATE TABLE IF NOT EXISTS wallet_participants (
  id VARCHAR(36) PRIMARY KEY,
  wallet_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  share_index INT NOT NULL,
  encrypted_share TEXT NOT NULL,
  public_key VARCHAR(255) NOT NULL,
  status ENUM('active', 'backup', 'recovered', 'lost') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wallet_user (wallet_id, user_id),
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建交易表
CREATE TABLE IF NOT EXISTS transactions (
  id VARCHAR(36) PRIMARY KEY,
  wallet_id VARCHAR(36) NOT NULL,
  tx_hash VARCHAR(255) NULL,
  from_address VARCHAR(255) NOT NULL,
  to_address VARCHAR(255) NOT NULL,
  amount DECIMAL(65,18) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  gas_limit VARCHAR(20) NULL,
  gas_price VARCHAR(20) NULL,
  status ENUM('pending', 'approved', 'signed', 'broadcasted', 'confirmed', 'failed', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  type ENUM('send', 'receive', 'internal') NOT NULL DEFAULT 'send',
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_tx_hash (tx_hash),
  INDEX idx_status (status),
  INDEX idx_type (type),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建交易审批表
CREATE TABLE IF NOT EXISTS transaction_approvals (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  approved BOOLEAN NOT NULL,
  comment TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_transaction_user (transaction_id, user_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_user_id (user_id),
  INDEX idx_approved (approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建交易签名表
CREATE TABLE IF NOT EXISTS transaction_signatures (
  id VARCHAR(36) PRIMARY KEY,
  transaction_id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_transaction_user (transaction_id, user_id),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建钱包余额表
CREATE TABLE IF NOT EXISTS wallet_balances (
  id VARCHAR(36) PRIMARY KEY,
  wallet_id VARCHAR(36) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  balance DECIMAL(65,18) NOT NULL DEFAULT 0,
  decimals INT NOT NULL DEFAULT 18,
  usd_value DECIMAL(20,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE,
  UNIQUE KEY unique_wallet_symbol (wallet_id, symbol),
  INDEX idx_wallet_id (wallet_id),
  INDEX idx_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建审计日志表
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  username VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  resource_id VARCHAR(36) NOT NULL,
  details JSON NULL,
  ip_address VARCHAR(45) NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_action (action),
  INDEX idx_resource (resource),
  INDEX idx_resource_id (resource_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id VARCHAR(36) PRIMARY KEY,
  key_name VARCHAR(100) UNIQUE NOT NULL,
  key_value TEXT NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_key_name (key_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认管理员用户
INSERT INTO users (id, username, email, password, role, organization, status) VALUES 
('admin-001', 'admin', 'admin@mpcwallet.com', '$2b$10$rQZ8K9mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'admin', 'MPC Wallet Team', 'active')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 插入默认系统配置
INSERT INTO system_configs (id, key_name, key_value, description) VALUES 
('config-001', 'mpc_algorithm', 'shamir', 'MPC算法类型'),
('config-002', 'mpc_key_type', 'secp256k1', '密钥类型'),
('config-003', 'mpc_prime', '0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F', '椭圆曲线素数'),
('config-004', 'min_approvers', '2', '最少审批人数'),
('config-005', 'max_approvers', '5', '最多审批人数'),
('config-006', 'transaction_timeout', '3600', '交易超时时间（秒）'),
('config-007', 'session_timeout', '86400', '会话超时时间（秒）')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 显示表结构
SHOW TABLES;

-- 显示表信息
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  DATA_LENGTH,
  INDEX_LENGTH,
  (DATA_LENGTH + INDEX_LENGTH) AS TOTAL_SIZE
FROM information_schema.TABLES 
WHERE TABLE_SCHEMA = 'mpc_wallet'; 