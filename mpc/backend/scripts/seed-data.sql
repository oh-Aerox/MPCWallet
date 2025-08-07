-- MPC Wallet 种子数据
-- 用于初始化数据库的测试数据

USE mpcwallet;

-- 插入用户数据
INSERT INTO users (id, username, email, password, role, organization, status, created_at, updated_at, last_login_at) VALUES 
('user-001', 'admin', 'admin@example.com', '$2b$10$rQZ8K9mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'admin', 'MPC Wallet Corp', 'active', NOW(), NOW(), NOW()),
('user-002', 'operator', 'operator@example.com', '$2b$10$rQZ8K9mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'operator', 'MPC Wallet Corp', 'active', NOW(), NOW(), NOW()),
('user-003', 'approver', 'approver@example.com', '$2b$10$rQZ8K9mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'approver', 'MPC Wallet Corp', 'active', NOW(), NOW(), NOW()),
('user-004', 'viewer', 'viewer@example.com', '$2b$10$rQZ8K9mN2pL1vX3yA6bC7dE8fG9hI0jK1lM2nO3pQ4rS5tU6vW7xY8zA9bC0dE1f', 'viewer', 'MPC Wallet Corp', 'active', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入钱包数据
INSERT INTO wallets (id, name, address, chain, threshold, total_shares, status, created_at, updated_at) VALUES 
('wallet-001', '主钱包', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', 'ethereum', 2, 3, 'active', NOW(), NOW()),
('wallet-002', '备用钱包', '0x9876543210fedcba1234567890abcdef12345678', 'ethereum', 3, 5, 'active', NOW(), NOW()),
('wallet-003', 'BTC钱包', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'bitcoin', 2, 3, 'active', NOW(), NOW()),
('wallet-004', 'BSC钱包', '0x1234567890abcdef1234567890abcdef12345678', 'bsc', 2, 4, 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入钱包余额数据
INSERT INTO wallet_balances (id, wallet_id, symbol, balance, decimals, usd_value, updated_at) VALUES 
('balance-001', 'wallet-001', 'ETH', '1.23456789', 18, 1234.56, NOW()),
('balance-002', 'wallet-001', 'USDT', '1000.00', 6, 1000.00, NOW()),
('balance-003', 'wallet-002', 'ETH', '0.5', 18, 500.00, NOW()),
('balance-004', 'wallet-002', 'USDC', '500.00', 6, 500.00, NOW()),
('balance-005', 'wallet-003', 'BTC', '0.01', 8, 400.00, NOW()),
('balance-006', 'wallet-004', 'BNB', '10.0', 18, 2000.00, NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入钱包参与者数据
INSERT INTO wallet_participants (id, wallet_id, user_id, share_index, encrypted_share, public_key, status, created_at, updated_at) VALUES 
('participant-001', 'wallet-001', 'user-001', 1, 'encrypted_share_1_data', 'public_key_1', 'active', NOW(), NOW()),
('participant-002', 'wallet-001', 'user-002', 2, 'encrypted_share_2_data', 'public_key_2', 'active', NOW(), NOW()),
('participant-003', 'wallet-001', 'user-003', 3, 'encrypted_share_3_data', 'public_key_3', 'active', NOW(), NOW()),
('participant-004', 'wallet-002', 'user-001', 1, 'encrypted_share_4_data', 'public_key_4', 'active', NOW(), NOW()),
('participant-005', 'wallet-002', 'user-002', 2, 'encrypted_share_5_data', 'public_key_5', 'active', NOW(), NOW()),
('participant-006', 'wallet-002', 'user-003', 3, 'encrypted_share_6_data', 'public_key_6', 'active', NOW(), NOW()),
('participant-007', 'wallet-002', 'user-004', 4, 'encrypted_share_7_data', 'public_key_7', 'active', NOW(), NOW()),
('participant-008', 'wallet-002', 'admin-001', 5, 'encrypted_share_8_data', 'public_key_8', 'active', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入交易数据
INSERT INTO transactions (id, wallet_id, tx_hash, from_address, to_address, amount, symbol, gas_limit, gas_price, status, type, created_by, created_at, updated_at) VALUES 
('tx-001', 'wallet-001', '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '0x9876543210fedcba1234567890abcdef12345678', '0.1', 'ETH', '21000', '20000000000', 'confirmed', 'send', 'user-001', NOW(), NOW()),
('tx-002', 'wallet-001', '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', '0x9876543210fedcba1234567890abcdef12345678', '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6', '0.05', 'ETH', '21000', '20000000000', 'pending', 'send', 'user-002', NOW(), NOW()),
('tx-003', 'wallet-002', '0x7890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456', '0x1234567890abcdef1234567890abcdef12345678', '0xabcdef1234567890abcdef1234567890abcdef12', '100.00', 'USDC', '65000', '5000000000', 'approved', 'send', 'user-001', NOW(), NOW()),
('tx-004', 'wallet-003', '0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', '0.001', 'BTC', NULL, NULL, 'signed', 'send', 'user-003', NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 插入交易审批数据
INSERT INTO transaction_approvals (id, transaction_id, user_id, approved, comment, created_at) VALUES 
('approval-001', 'tx-001', 'user-001', true, '交易已确认', NOW()),
('approval-002', 'tx-001', 'user-002', true, '同意交易', NOW()),
('approval-003', 'tx-002', 'user-001', true, '审批通过', NOW()),
('approval-004', 'tx-003', 'user-001', true, '同意', NOW()),
('approval-005', 'tx-003', 'user-002', true, '审批通过', NOW()),
('approval-006', 'tx-003', 'user-003', true, '同意交易', NOW()),
('approval-007', 'tx-004', 'user-001', true, 'BTC交易审批', NOW()),
('approval-008', 'tx-004', 'user-002', true, '同意', NOW())
ON DUPLICATE KEY UPDATE created_at = NOW();

-- 插入交易签名数据
INSERT INTO transaction_signatures (id, transaction_id, user_id, signature, created_at) VALUES 
('signature-001', 'tx-001', 'user-001', 'signature_data_1', NOW()),
('signature-002', 'tx-001', 'user-002', 'signature_data_2', NOW()),
('signature-003', 'tx-003', 'user-001', 'signature_data_3', NOW()),
('signature-004', 'tx-003', 'user-002', 'signature_data_4', NOW()),
('signature-005', 'tx-003', 'user-003', 'signature_data_5', NOW()),
('signature-006', 'tx-004', 'user-001', 'signature_data_6', NOW()),
('signature-007', 'tx-004', 'user-002', 'signature_data_7', NOW())
ON DUPLICATE KEY UPDATE created_at = NOW();

-- 插入审计日志数据
INSERT INTO audit_logs (id, user_id, username, action, resource, resource_id, details, ip_address, user_agent, created_at) VALUES 
('audit-001', 'user-001', 'admin', 'login', 'user', 'user-001', '{"ip": "192.168.1.100", "userAgent": "Mozilla/5.0"}', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW()),
('audit-002', 'user-001', 'admin', 'create_wallet', 'wallet', 'wallet-001', '{"walletName": "主钱包", "chain": "ethereum"}', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW()),
('audit-003', 'user-002', 'operator', 'create_transaction', 'transaction', 'tx-001', '{"amount": "0.1", "symbol": "ETH"}', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0)', NOW()),
('audit-004', 'user-001', 'admin', 'approve_transaction', 'transaction', 'tx-001', '{"approved": true, "comment": "交易已确认"}', '192.168.1.100', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', NOW()),
('audit-005', 'user-002', 'operator', 'sign_transaction', 'transaction', 'tx-001', '{"signature": "signature_data_2"}', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0)', NOW())
ON DUPLICATE KEY UPDATE created_at = NOW();

-- 显示插入的数据统计
SELECT 
  'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'wallets', COUNT(*) FROM wallets
UNION ALL
SELECT 'wallet_balances', COUNT(*) FROM wallet_balances
UNION ALL
SELECT 'wallet_participants', COUNT(*) FROM wallet_participants
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'transaction_approvals', COUNT(*) FROM transaction_approvals
UNION ALL
SELECT 'transaction_signatures', COUNT(*) FROM transaction_signatures
UNION ALL
SELECT 'audit_logs', COUNT(*) FROM audit_logs; 