const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

/**
 * 获取所有用户
 * GET /api/users
 */
router.get('/', async (req, res) => {
  try {
    const users = await query(
      'SELECT id, username, email, role, organization, status, created_at, last_login_at FROM users ORDER BY created_at DESC'
    );

    res.json({
      success: true,
      data: users.map(user => ({
        ...user,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      }))
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户列表失败'
    });
  }
});

/**
 * 获取单个用户
 * GET /api/users/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const users = await query(
      'SELECT id, username, email, role, organization, status, created_at, last_login_at FROM users WHERE id = ?',
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    const user = users[0];
    res.json({
      success: true,
      data: {
        ...user,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      error: '获取用户信息失败'
    });
  }
});

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', async (req, res) => {
  try {
    const { username, email, password, role, organization, status } = req.body;

    // 验证必填字段
    if (!username || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        error: '用户名、邮箱、密码和角色是必填项'
      });
    }

    // 检查用户名是否已存在
    const existingUsers = await query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: '用户名或邮箱已存在'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const userId = uuidv4();
    await query(
      `INSERT INTO users (id, username, email, password, role, organization, status, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [userId, username, email, hashedPassword, role, organization || null, status || 'active']
    );

    res.status(201).json({
      success: true,
      message: '用户创建成功',
      data: { id: userId }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      error: '创建用户失败'
    });
  }
});

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, role, organization, status } = req.body;

    // 验证必填字段
    if (!username || !email || !role) {
      return res.status(400).json({
        success: false,
        error: '用户名、邮箱和角色是必填项'
      });
    }

    // 检查用户是否存在
    const existingUsers = await query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 检查用户名和邮箱是否被其他用户使用
    const duplicateUsers = await query(
      'SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?',
      [username, email, id]
    );

    if (duplicateUsers.length > 0) {
      return res.status(400).json({
        success: false,
        error: '用户名或邮箱已被其他用户使用'
      });
    }

    // 更新用户
    await query(
      `UPDATE users SET 
       username = ?, email = ?, role = ?, organization = ?, status = ?, updated_at = NOW()
       WHERE id = ?`,
      [username, email, role, organization || null, status || 'active', id]
    );

    res.json({
      success: true,
      message: '用户更新成功'
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: '更新用户失败'
    });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 检查用户是否存在
    const existingUsers = await query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 检查用户是否有关联的钱包或交易
    const walletParticipants = await query(
      'SELECT id FROM wallet_participants WHERE user_id = ?',
      [id]
    );

    if (walletParticipants.length > 0) {
      return res.status(400).json({
        success: false,
        error: '该用户参与了钱包，无法删除'
      });
    }

    // 删除用户
    await query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '用户删除成功'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: '删除用户失败'
    });
  }
});

/**
 * 更新用户密码
 * PUT /api/users/:id/password
 */
router.put('/:id/password', async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        error: '密码是必填项'
      });
    }

    // 检查用户是否存在
    const existingUsers = await query(
      'SELECT id FROM users WHERE id = ?',
      [id]
    );

    if (existingUsers.length === 0) {
      return res.status(404).json({
        success: false,
        error: '用户不存在'
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 更新密码
    await query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );

    res.json({
      success: true,
      message: '密码更新成功'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      error: '更新密码失败'
    });
  }
});

module.exports = router; 