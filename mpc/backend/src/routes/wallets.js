const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { ShamirSecretSharing } = require('../../../mpc-core/src/index');
const { authenticateToken } = require('../middleware/auth');
const { validateWalletData } = require('../middleware/validation');
const { logAudit } = require('../utils/audit');

// 模拟数据库
let wallets = [];
let mpcShares = [];

// 初始化MPC实例
const shamir = new ShamirSecretSharing();

/**
 * 获取所有钱包
 * GET /api/wallets
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 过滤用户有权限的钱包
    const userWallets = wallets.filter(wallet => 
      wallet.participants.includes(req.user.id)
    );

    res.json({
      success: true,
      data: userWallets,
      total: userWallets.length
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
 * 获取单个钱包详情
 * GET /api/wallets/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const wallet = wallets.find(w => w.id === req.params.id);
    
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

    // 获取钱包的MPC份额信息
    const shares = mpcShares.filter(share => share.walletId === wallet.id);

    res.json({
      success: true,
      data: {
        ...wallet,
        shares
      }
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet'
    });
  }
});

/**
 * 创建新钱包
 * POST /api/wallets
 */
router.post('/', authenticateToken, validateWalletData, async (req, res) => {
  try {
    const { name, chain, threshold, totalShares, participants } = req.body;

    // 验证参与者数量
    if (participants.length < threshold) {
      return res.status(400).json({
        success: false,
        error: 'Number of participants must be greater than or equal to threshold'
      });
    }

    // 生成私钥
    const privateKey = crypto.randomBytes(32);
    const privateKeyBigInt = BigInt('0x' + privateKey.toString('hex'));

    // 使用MPC分割私钥
    const shares = shamir.split(privateKeyBigInt, totalShares, threshold);

    // 生成钱包地址（这里简化处理）
    const address = '0x' + crypto.randomBytes(20).toString('hex');

    // 创建钱包对象
    const wallet = {
      id: uuidv4(),
      name,
      address,
      chain,
      threshold,
      totalShares,
      participants,
      status: 'active',
      balance: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 保存钱包
    wallets.push(wallet);

    // 保存MPC份额
    const mpcShareObjects = shares.map((share, index) => ({
      id: uuidv4(),
      walletId: wallet.id,
      userId: participants[index],
      shareIndex: share.index,
      encryptedShare: encryptShare(share.y), // 加密份额
      publicKey: generatePublicKey(privateKeyBigInt),
      status: 'active',
      createdAt: new Date()
    }));

    mpcShares.push(...mpcShareObjects);

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'CREATE_WALLET',
      resource: 'WALLET',
      resourceId: wallet.id,
      details: {
        walletName: name,
        chain,
        threshold,
        totalShares,
        participantsCount: participants.length
      }
    });

    // 通过WebSocket通知相关用户
    const io = req.app.get('io');
    participants.forEach(participantId => {
      io.to(`user-${participantId}`).emit('wallet-created', {
        walletId: wallet.id,
        walletName: name
      });
    });

    res.status(201).json({
      success: true,
      data: wallet,
      message: 'Wallet created successfully'
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create wallet'
    });
  }
});

/**
 * 更新钱包
 * PUT /api/wallets/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const wallet = wallets.find(w => w.id === req.params.id);
    
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

    // 更新钱包信息
    const { name, status } = req.body;
    if (name) wallet.name = name;
    if (status) wallet.status = status;
    wallet.updatedAt = new Date();

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_WALLET',
      resource: 'WALLET',
      resourceId: wallet.id,
      details: req.body
    });

    res.json({
      success: true,
      data: wallet,
      message: 'Wallet updated successfully'
    });
  } catch (error) {
    console.error('Error updating wallet:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update wallet'
    });
  }
});

/**
 * 获取钱包余额
 * GET /api/wallets/:id/balance
 */
router.get('/:id/balance', authenticateToken, async (req, res) => {
  try {
    const wallet = wallets.find(w => w.id === req.params.id);
    
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

    // 这里应该调用区块链API获取真实余额
    // 目前返回模拟数据
    const balance = [
      {
        symbol: 'ETH',
        balance: '1.23456789',
        decimals: 18,
        usdValue: 1234.56
      },
      {
        symbol: 'USDT',
        balance: '1000.00',
        decimals: 6,
        usdValue: 1000.00
      }
    ];

    wallet.balance = balance;

    res.json({
      success: true,
      data: balance
    });
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet balance'
    });
  }
});

/**
 * 获取钱包的MPC份额
 * GET /api/wallets/:id/shares
 */
router.get('/:id/shares', authenticateToken, async (req, res) => {
  try {
    const wallet = wallets.find(w => w.id === req.params.id);
    
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

    // 获取用户的份额
    const userShares = mpcShares.filter(share => 
      share.walletId === wallet.id && share.userId === req.user.id
    );

    res.json({
      success: true,
      data: userShares
    });
  } catch (error) {
    console.error('Error fetching wallet shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet shares'
    });
  }
});

/**
 * 份额轮换
 * POST /api/wallets/:id/refresh-shares
 */
router.post('/:id/refresh-shares', authenticateToken, async (req, res) => {
  try {
    const wallet = wallets.find(w => w.id === req.params.id);
    
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

    const { newThreshold, newTotalShares, newParticipants } = req.body;

    // 获取当前份额
    const currentShares = mpcShares.filter(share => share.walletId === wallet.id);
    
    if (currentShares.length < wallet.threshold) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient shares for refresh'
      });
    }

    // 恢复原始私钥
    const shareValues = currentShares.slice(0, wallet.threshold).map(share => ({
      x: share.shareIndex.toString(),
      y: decryptShare(share.encryptedShare),
      threshold: wallet.threshold,
      totalShares: wallet.totalShares
    }));

    const privateKey = shamir.reconstruct(shareValues);

    // 生成新份额
    const newShares = shamir.split(privateKey, newTotalShares, newThreshold);

    // 更新钱包配置
    wallet.threshold = newThreshold;
    wallet.totalShares = newTotalShares;
    wallet.participants = newParticipants;
    wallet.updatedAt = new Date();

    // 删除旧份额
    mpcShares = mpcShares.filter(share => share.walletId !== wallet.id);

    // 保存新份额
    const newMpcShares = newShares.map((share, index) => ({
      id: uuidv4(),
      walletId: wallet.id,
      userId: newParticipants[index],
      shareIndex: share.index,
      encryptedShare: encryptShare(share.y),
      publicKey: generatePublicKey(privateKey),
      status: 'active',
      createdAt: new Date()
    }));

    mpcShares.push(...newMpcShares);

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'REFRESH_SHARES',
      resource: 'WALLET',
      resourceId: wallet.id,
      details: {
        oldThreshold: wallet.threshold,
        newThreshold,
        oldTotalShares: wallet.totalShares,
        newTotalShares
      }
    });

    res.json({
      success: true,
      data: wallet,
      message: 'Shares refreshed successfully'
    });
  } catch (error) {
    console.error('Error refreshing shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh shares'
    });
  }
});

// 辅助函数
function encryptShare(share) {
  // 这里应该使用真实的加密算法
  return Buffer.from(share.toString()).toString('base64');
}

function decryptShare(encryptedShare) {
  // 这里应该使用真实的解密算法
  return BigInt(Buffer.from(encryptedShare, 'base64').toString());
}

function generatePublicKey(privateKey) {
  // 这里应该使用真实的椭圆曲线算法生成公钥
  return '0x' + crypto.randomBytes(33).toString('hex');
}

module.exports = router; 