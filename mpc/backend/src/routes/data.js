const express = require('express');
const router = express.Router();
const { query } = require('../config/database');

/**
 * 获取所有用户
 * GET /api/data/users
 */
router.get('/users', async (req, res) => {
  try {
    const users = await query(`
      SELECT 
        id, username, email, role, organization, status, 
        created_at, updated_at, last_login_at
      FROM users 
      ORDER BY created_at DESC
    `);

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

/**
 * 获取所有钱包
 * GET /api/data/wallets
 */
router.get('/wallets', async (req, res) => {
  try {
    const wallets = await query(`
      SELECT 
        w.id, w.name, w.address, w.chain, w.threshold, w.total_shares, w.status,
        w.created_at, w.updated_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'symbol', wb.symbol,
            'balance', wb.balance,
            'decimals', wb.decimals,
            'usdValue', wb.usd_value
          )
        ) as balance
      FROM wallets w
      LEFT JOIN wallet_balances wb ON w.id = wb.wallet_id
      GROUP BY w.id
      ORDER BY w.created_at DESC
    `);

    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallets'
    });
  }
});

/**
 * 获取所有交易
 * GET /api/data/transactions
 */
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await query(`
      SELECT 
        t.id, t.wallet_id, t.tx_hash, t.from_address, t.to_address,
        t.amount, t.symbol, t.gas_limit, t.gas_price, t.status, t.type,
        t.created_by, t.created_at, t.updated_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', ta.id,
            'userId', ta.user_id,
            'approved', ta.approved,
            'comment', ta.comment,
            'timestamp', ta.created_at
          )
        ) as approvals,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', ts.id,
            'userId', ts.user_id,
            'signature', ts.signature,
            'timestamp', ts.created_at
          )
        ) as signatures
      FROM transactions t
      LEFT JOIN transaction_approvals ta ON t.id = ta.transaction_id
      LEFT JOIN transaction_signatures ts ON t.id = ts.transaction_id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);

    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transactions'
    });
  }
});

/**
 * 获取当前用户信息
 * GET /api/data/current-user
 */
router.get('/current-user', async (req, res) => {
  try {
    // 返回默认用户信息，因为不再需要认证
    const defaultUser = {
      id: 'user-001',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      organization: 'MPC Wallet Corp',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
      last_login_at: new Date()
    };
    
    res.json({
      success: true,
      data: defaultUser
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch current user'
    });
  }
});

/**
 * 获取仪表板统计数据
 * GET /api/data/dashboard-stats
 */
router.get('/dashboard-stats', async (req, res) => {
  try {
    const [walletCount] = await query('SELECT COUNT(*) as count FROM wallets WHERE status = "active"');
    const [transactionCount] = await query('SELECT COUNT(*) as count FROM transactions');
    const [pendingTransactionCount] = await query('SELECT COUNT(*) as count FROM transactions WHERE status = "pending"');
    const [userCount] = await query('SELECT COUNT(*) as count FROM users WHERE status = "active"');
    const [totalBalance] = await query('SELECT SUM(usd_value) as total FROM wallet_balances');

    const stats = {
      totalWallets: walletCount.count,
      totalTransactions: transactionCount.count,
      pendingTransactions: pendingTransactionCount.count,
      activeUsers: userCount.count,
      totalBalance: totalBalance.total || 0
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
});

module.exports = router; 