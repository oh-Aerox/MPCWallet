const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { logAudit } = require('../utils/audit');
const ShamirSecretSharing = require('../../mpc-core/src/shamir');

// 初始化MPC实例
const shamir = new ShamirSecretSharing();

/**
 * 获取MPC配置
 * GET /api/mpc/config
 */
router.get('/config', authenticateToken, async (req, res) => {
  try {
    const config = {
      algorithm: 'shamir',
      keyType: 'secp256k1',
      encryption: 'AES-256-GCM',
      communication: 'TLS-1.3',
      supportedChains: ['bitcoin', 'ethereum', 'bsc', 'polygon'],
      maxThreshold: 10,
      maxShares: 20,
      prime: shamir.prime.toString()
    };

    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    console.error('Error fetching MPC config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MPC config'
    });
  }
});

/**
 * 验证份额
 * POST /api/mpc/verify-shares
 */
router.post('/verify-shares', authenticateToken, async (req, res) => {
  try {
    const { walletId, shares } = req.body;

    if (!shares || !Array.isArray(shares) || shares.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'At least 2 shares are required'
      });
    }

    // 验证份额格式
    const validShares = shares.every(share => 
      share.index && share.value && 
      typeof share.index === 'number' && 
      typeof share.value === 'string'
    );

    if (!validShares) {
      return res.status(400).json({
        success: false,
        error: 'Invalid share format'
      });
    }

    // 验证份额是否来自同一个秘密
    const isValid = shamir.verifyShares(shares);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: 'Shares are not from the same secret'
      });
    }

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'VERIFY_SHARES',
      resource: 'MPC',
      resourceId: walletId,
      details: {
        shareCount: shares.length,
        isValid
      }
    });

    res.json({
      success: true,
      data: {
        valid: true,
        threshold: shares[0].threshold,
        totalShares: shares[0].totalShares,
        shareCount: shares.length
      }
    });
  } catch (error) {
    console.error('Error verifying shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify shares'
    });
  }
});

/**
 * 份额备份
 * POST /api/mpc/backup-shares
 */
router.post('/backup-shares', authenticateToken, async (req, res) => {
  try {
    const { walletId, backupType } = req.body;

    if (!walletId) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID is required'
      });
    }

    // 这里应该从数据库获取钱包的份额
    // 目前返回模拟数据
    const backupData = {
      walletId,
      backupType: backupType || 'encrypted_file',
      timestamp: new Date(),
      shares: [
        {
          index: 1,
          value: 'encrypted_share_1',
          encrypted: true
        },
        {
          index: 2,
          value: 'encrypted_share_2',
          encrypted: true
        }
      ]
    };

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'BACKUP_SHARES',
      resource: 'MPC',
      resourceId: walletId,
      details: {
        backupType: backupData.backupType,
        shareCount: backupData.shares.length
      }
    });

    res.json({
      success: true,
      data: backupData,
      message: 'Shares backed up successfully'
    });
  } catch (error) {
    console.error('Error backing up shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to backup shares'
    });
  }
});

/**
 * 份额恢复
 * POST /api/mpc/restore-shares
 */
router.post('/restore-shares', authenticateToken, async (req, res) => {
  try {
    const { walletId, backupData } = req.body;

    if (!walletId || !backupData) {
      return res.status(400).json({
        success: false,
        error: 'Wallet ID and backup data are required'
      });
    }

    // 验证备份数据
    if (!backupData.shares || !Array.isArray(backupData.shares)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup data format'
      });
    }

    // 这里应该验证备份数据的完整性
    // 并恢复份额到数据库

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'RESTORE_SHARES',
      resource: 'MPC',
      resourceId: walletId,
      details: {
        shareCount: backupData.shares.length,
        backupTimestamp: backupData.timestamp
      }
    });

    res.json({
      success: true,
      data: {
        walletId,
        restoredShares: backupData.shares.length,
        timestamp: new Date()
      },
      message: 'Shares restored successfully'
    });
  } catch (error) {
    console.error('Error restoring shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore shares'
    });
  }
});

/**
 * 生成新份额
 * POST /api/mpc/generate-shares
 */
router.post('/generate-shares', authenticateToken, async (req, res) => {
  try {
    const { totalShares, threshold } = req.body;

    if (!totalShares || !threshold) {
      return res.status(400).json({
        success: false,
        error: 'Total shares and threshold are required'
      });
    }

    if (threshold > totalShares) {
      return res.status(400).json({
        success: false,
        error: 'Threshold cannot be greater than total shares'
      });
    }

    // 生成随机私钥
    const crypto = require('crypto');
    const privateKey = crypto.randomBytes(32);
    const privateKeyBigInt = BigInt('0x' + privateKey.toString('hex'));

    // 使用MPC分割私钥
    const shares = shamir.split(privateKeyBigInt, totalShares, threshold);

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'GENERATE_SHARES',
      resource: 'MPC',
      resourceId: 'new_wallet',
      details: {
        totalShares,
        threshold,
        shareCount: shares.length
      }
    });

    res.json({
      success: true,
      data: {
        shares,
        totalShares,
        threshold,
        publicKey: '0x' + crypto.randomBytes(33).toString('hex') // 模拟公钥
      },
      message: 'Shares generated successfully'
    });
  } catch (error) {
    console.error('Error generating shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate shares'
    });
  }
});

/**
 * 份额轮换
 * POST /api/mpc/rotate-shares
 */
router.post('/rotate-shares', authenticateToken, async (req, res) => {
  try {
    const { walletId, oldShares, newThreshold, newTotalShares } = req.body;

    if (!walletId || !oldShares || !newThreshold || !newTotalShares) {
      return res.status(400).json({
        success: false,
        error: 'All parameters are required'
      });
    }

    if (newThreshold > newTotalShares) {
      return res.status(400).json({
        success: false,
        error: 'New threshold cannot be greater than new total shares'
      });
    }

    // 验证旧份额
    if (!shamir.verifyShares(oldShares)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid old shares'
      });
    }

    // 恢复原始私钥
    const privateKey = shamir.reconstruct(oldShares);

    // 生成新份额
    const newShares = shamir.split(privateKey, newTotalShares, newThreshold);

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'ROTATE_SHARES',
      resource: 'MPC',
      resourceId: walletId,
      details: {
        oldThreshold: oldShares[0].threshold,
        newThreshold,
        oldTotalShares: oldShares[0].totalShares,
        newTotalShares
      }
    });

    res.json({
      success: true,
      data: {
        walletId,
        newShares,
        newThreshold,
        newTotalShares,
        timestamp: new Date()
      },
      message: 'Shares rotated successfully'
    });
  } catch (error) {
    console.error('Error rotating shares:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rotate shares'
    });
  }
});

/**
 * 获取MPC状态
 * GET /api/mpc/status
 */
router.get('/status', authenticateToken, async (req, res) => {
  try {
    const status = {
      algorithm: 'Shamir Secret Sharing',
      status: 'active',
      version: '1.0.0',
      supportedOperations: [
        'share_generation',
        'share_verification',
        'share_rotation',
        'key_reconstruction'
      ],
      securityLevel: 'high',
      lastMaintenance: new Date(),
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error fetching MPC status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MPC status'
    });
  }
});

module.exports = router; 