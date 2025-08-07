const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { ShamirSecretSharing } = require('../../../mpc-core/src/index');
const secp256k1 = require('secp256k1');
const keccak = require('keccak');
const EC = require('elliptic').ec;
const ec = new EC('secp256k1');

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
router.get('/', async (req, res) => {
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
router.get('/:id', async (req, res) => {
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
router.post('/', validateWalletData, async (req, res) => {
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
    const key = ec.genKeyPair();

    const privateKey = key.getPrivate('hex');
    // const privateKey = crypto.randomBytes(32);
    const privateKeyBigInt = BigInt('0x' + privateKey);

    // 使用MPC分割私钥
    const shares = shamir.split(privateKeyBigInt, totalShares, threshold);

    // 从私钥生成公钥和地址
    // const publicKey = generatePublicKey(privateKey);
    // const address = generateAddress(publicKey);
    const publicKey = key.getPublic(false, 'hex').slice(2); // 去掉 0x04 前缀
    const address = keccak('keccak256').update(Buffer.from(publicKey, 'hex')).digest('hex').slice(-40);


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
      publicKey: publicKey,
      status: 'active',
      createdAt: new Date()
    }));

    mpcShares.push(...mpcShareObjects);

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
router.put('/:id', async (req, res) => {
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
router.get('/:id/balance', async (req, res) => {
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
router.get('/:id/shares', async (req, res) => {
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
router.post('/:id/refresh-shares', async (req, res) => {
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
      publicKey: generatePublicKey(Buffer.from(privateKey.toString(16).padStart(64, '0'), 'hex')),
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

// 加密份额
function encryptShare(share) {
  try {
    // 获取加密密钥和算法
    const encryptionKey = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key';
    const algorithm = 'aes-256-gcm';
    
    // 确保密钥长度为32字节
    const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
    
    // 生成随机IV
    const iv = crypto.randomBytes(16);
    
    // 创建cipher
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    cipher.setAAD(Buffer.from('MPC_SHARE', 'utf8'));
    
    // 加密份额
    const shareBuffer = Buffer.from(share.toString(), 'utf8');
    let encrypted = cipher.update(shareBuffer, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // 获取认证标签
    const authTag = cipher.getAuthTag();
    
    // 组合IV、加密数据和认证标签
    const result = {
      iv: iv.toString('hex'),
      encrypted: encrypted,
      authTag: authTag.toString('hex')
    };
    
    return JSON.stringify(result);
  } catch (error) {
    console.error('Encryption error:', error);
    // 降级到base64编码
    return Buffer.from(share.toString()).toString('base64');
  }
}

function decryptShare(encryptedShare) {
  try {
    // 尝试解析JSON格式的加密数据
    const encryptedData = JSON.parse(encryptedShare);
    
    if (encryptedData.iv && encryptedData.encrypted && encryptedData.authTag) {
      // 使用AES-GCM解密
      const encryptionKey = process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key';
      const algorithm = 'aes-256-gcm';
      
      const key = Buffer.from(encryptionKey.padEnd(32, '0').slice(0, 32));
      const iv = Buffer.from(encryptedData.iv, 'hex');
      const authTag = Buffer.from(encryptedData.authTag, 'hex');
      
      // 创建decipher
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAAD(Buffer.from('MPC_SHARE', 'utf8'));
      decipher.setAuthTag(authTag);
      
      // 解密
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return BigInt(decrypted);
    } else {
      // 降级到base64解码
      return BigInt(Buffer.from(encryptedShare, 'base64').toString());
    }
  } catch (error) {
    console.error('Decryption error:', error);
    // 降级到base64解码
    return BigInt(Buffer.from(encryptedShare, 'base64').toString());
  }
}

function generatePublicKey(privateKey) {
  // 使用secp256k1椭圆曲线生成公钥
  const publicKey = secp256k1.publicKeyCreate(privateKey, false);
  return '0x' + publicKey.toString('hex');
}

function generateAddress(publicKey) {
  // 从公钥生成以太坊地址
  // 1. 移除0x前缀
  const pubKeyHex = publicKey.replace('0x', '');
  
  // 2. 计算Keccak-256哈希
  const hash = keccak('keccak256').update(Buffer.from(pubKeyHex, 'hex')).digest();
  
  // 3. 取最后20字节作为地址
  const address = '0x' + hash.slice(-20).toString('hex');
  
  return address;
}

module.exports = router; 