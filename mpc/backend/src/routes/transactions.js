const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const ShamirSecretSharing = require('../../mpc-core/src/shamir');
const { authenticateToken } = require('../middleware/auth');
const { validateTransactionData } = require('../middleware/validation');
const { logAudit } = require('../utils/audit');

// 模拟数据库
let transactions = [];
let wallets = [];

// 初始化MPC实例
const shamir = new ShamirSecretSharing();

/**
 * 获取所有交易
 * GET /api/transactions
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, walletId } = req.query;
    
    let filteredTransactions = transactions;

    // 按状态过滤
    if (status) {
      filteredTransactions = filteredTransactions.filter(tx => tx.status === status);
    }

    // 按钱包过滤
    if (walletId) {
      filteredTransactions = filteredTransactions.filter(tx => tx.walletId === walletId);
    }

    // 过滤用户有权限的交易
    filteredTransactions = filteredTransactions.filter(tx => {
      const wallet = wallets.find(w => w.id === tx.walletId);
      return wallet && wallet.participants.includes(req.user.id);
    });

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: paginatedTransactions,
      pagination: {
        total: filteredTransactions.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredTransactions.length / limit)
      }
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
 * 获取单个交易详情
 * GET /api/transactions/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const transaction = transactions.find(tx => tx.id === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // 检查用户权限
    const wallet = wallets.find(w => w.id === transaction.walletId);
    if (!wallet || !wallet.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error fetching transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction'
    });
  }
});

/**
 * 创建新交易
 * POST /api/transactions
 */
router.post('/', authenticateToken, validateTransactionData, async (req, res) => {
  try {
    const { walletId, to, amount, symbol, gasLimit, gasPrice } = req.body;

    // 检查钱包是否存在
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'Wallet not found'
      });
    }

    // 检查用户权限
    if (!wallet.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // 创建交易对象
    const transaction = {
      id: uuidv4(),
      walletId,
      txHash: null, // 待签名后生成
      from: wallet.address,
      to,
      amount,
      symbol,
      gasLimit: gasLimit || '21000',
      gasPrice: gasPrice || '20000000000',
      status: 'pending',
      type: 'send',
      signatures: [],
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 保存交易
    transactions.push(transaction);

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'CREATE_TRANSACTION',
      resource: 'TRANSACTION',
      resourceId: transaction.id,
      details: {
        walletId,
        to,
        amount,
        symbol
      }
    });

    // 通过WebSocket通知相关用户
    const io = req.app.get('io');
    wallet.participants.forEach(participantId => {
      io.to(`user-${participantId}`).emit('transaction-created', {
        transactionId: transaction.id,
        walletId,
        amount,
        symbol
      });
    });

    res.status(201).json({
      success: true,
      data: transaction,
      message: 'Transaction created successfully'
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create transaction'
    });
  }
});

/**
 * 审批交易
 * POST /api/transactions/:id/approve
 */
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { approved, comment } = req.body;
    const transaction = transactions.find(tx => tx.id === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // 检查交易状态
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Transaction is not in pending status'
      });
    }

    // 检查钱包权限
    const wallet = wallets.find(w => w.id === transaction.walletId);
    if (!wallet || !wallet.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // 检查是否已经审批过
    const existingApproval = transaction.approvals.find(a => a.userId === req.user.id);
    if (existingApproval) {
      return res.status(400).json({
        success: false,
        error: 'You have already approved this transaction'
      });
    }

    // 添加审批记录
    const approval = {
      id: uuidv4(),
      userId: req.user.id,
      username: req.user.username,
      approved,
      comment,
      timestamp: new Date()
    };

    transaction.approvals.push(approval);

    // 检查是否达到审批阈值
    const approvedCount = transaction.approvals.filter(a => a.approved).length;
    const requiredApprovals = Math.ceil(wallet.participants.length * 0.6); // 60%的参与者需要审批

    if (approvedCount >= requiredApprovals) {
      transaction.status = 'approved';
    } else if (transaction.approvals.filter(a => !a.approved).length > 0) {
      transaction.status = 'rejected';
    }

    transaction.updatedAt = new Date();

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'APPROVE_TRANSACTION',
      resource: 'TRANSACTION',
      resourceId: transaction.id,
      details: {
        approved,
        comment,
        newStatus: transaction.status
      }
    });

    // 通过WebSocket通知相关用户
    const io = req.app.get('io');
    wallet.participants.forEach(participantId => {
      io.to(`user-${participantId}`).emit('transaction-approved', {
        transactionId: transaction.id,
        approved,
        newStatus: transaction.status
      });
    });

    res.json({
      success: true,
      data: transaction,
      message: `Transaction ${approved ? 'approved' : 'rejected'} successfully`
    });
  } catch (error) {
    console.error('Error approving transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve transaction'
    });
  }
});

/**
 * 签名交易
 * POST /api/transactions/:id/sign
 */
router.post('/:id/sign', authenticateToken, async (req, res) => {
  try {
    const transaction = transactions.find(tx => tx.id === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // 检查交易状态
    if (transaction.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Transaction must be approved before signing'
      });
    }

    // 检查钱包权限
    const wallet = wallets.find(w => w.id === transaction.walletId);
    if (!wallet || !wallet.participants.includes(req.user.id)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    // 检查是否已经签名
    const existingSignature = transaction.signatures.find(s => s.userId === req.user.id);
    if (existingSignature) {
      return res.status(400).json({
        success: false,
        error: 'You have already signed this transaction'
      });
    }

    // 这里应该实现真实的MPC签名过程
    // 目前使用模拟签名
    const signature = {
      id: uuidv4(),
      userId: req.user.id,
      username: req.user.username,
      signature: '0x' + crypto.randomBytes(64).toString('hex'),
      timestamp: new Date()
    };

    transaction.signatures.push(signature);

    // 检查是否达到签名阈值
    if (transaction.signatures.length >= wallet.threshold) {
      // 生成交易哈希
      transaction.txHash = '0x' + crypto.randomBytes(32).toString('hex');
      transaction.status = 'signed';
      
      // 这里应该广播交易到区块链网络
      // 目前模拟广播过程
      setTimeout(() => {
        transaction.status = 'broadcasted';
        transaction.updatedAt = new Date();
        
        // 模拟交易确认
        setTimeout(() => {
          transaction.status = 'confirmed';
          transaction.updatedAt = new Date();
          
          // 通知用户交易确认
          const io = req.app.get('io');
          wallet.participants.forEach(participantId => {
            io.to(`user-${participantId}`).emit('transaction-confirmed', {
              transactionId: transaction.id,
              txHash: transaction.txHash
            });
          });
        }, 5000);
      }, 2000);
    }

    transaction.updatedAt = new Date();

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'SIGN_TRANSACTION',
      resource: 'TRANSACTION',
      resourceId: transaction.id,
      details: {
        signatureCount: transaction.signatures.length,
        threshold: wallet.threshold
      }
    });

    // 通过WebSocket通知相关用户
    const io = req.app.get('io');
    wallet.participants.forEach(participantId => {
      io.to(`user-${participantId}`).emit('transaction-signed', {
        transactionId: transaction.id,
        signatureCount: transaction.signatures.length,
        threshold: wallet.threshold
      });
    });

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction signed successfully'
    });
  } catch (error) {
    console.error('Error signing transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign transaction'
    });
  }
});

/**
 * 获取交易统计
 * GET /api/transactions/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userWallets = wallets.filter(wallet => 
      wallet.participants.includes(req.user.id)
    );

    const userTransactions = transactions.filter(tx => 
      userWallets.some(w => w.id === tx.walletId)
    );

    const stats = {
      total: userTransactions.length,
      pending: userTransactions.filter(tx => tx.status === 'pending').length,
      approved: userTransactions.filter(tx => tx.status === 'approved').length,
      signed: userTransactions.filter(tx => tx.status === 'signed').length,
      confirmed: userTransactions.filter(tx => tx.status === 'confirmed').length,
      failed: userTransactions.filter(tx => tx.status === 'failed').length,
      rejected: userTransactions.filter(tx => tx.status === 'rejected').length
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching transaction stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch transaction stats'
    });
  }
});

/**
 * 取消交易
 * POST /api/transactions/:id/cancel
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const transaction = transactions.find(tx => tx.id === req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // 检查交易状态
    if (transaction.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending transactions can be cancelled'
      });
    }

    // 检查用户权限（只有创建者可以取消）
    if (transaction.createdBy !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can cancel the transaction'
      });
    }

    transaction.status = 'cancelled';
    transaction.updatedAt = new Date();

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'CANCEL_TRANSACTION',
      resource: 'TRANSACTION',
      resourceId: transaction.id,
      details: {
        reason: req.body.reason
      }
    });

    res.json({
      success: true,
      data: transaction,
      message: 'Transaction cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling transaction:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel transaction'
    });
  }
});

module.exports = router; 