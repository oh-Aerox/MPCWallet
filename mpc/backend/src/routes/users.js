const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateUserData } = require('../middleware/validation');
const { logAudit } = require('../utils/audit');

// 模拟用户数据库
let users = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'admin',
    organization: 'MPC Wallet Corp',
    status: 'active',
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  {
    id: '2',
    username: 'operator',
    email: 'operator@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'operator',
    organization: 'MPC Wallet Corp',
    status: 'active',
    createdAt: new Date(),
    lastLoginAt: new Date()
  },
  {
    id: '3',
    username: 'approver',
    email: 'approver@example.com',
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'approver',
    organization: 'MPC Wallet Corp',
    status: 'active',
    createdAt: new Date(),
    lastLoginAt: new Date()
  }
];

/**
 * 获取用户列表
 * GET /api/users
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, role, status } = req.query;
    
    let filteredUsers = [...users];

    // 按角色过滤
    if (role) {
      filteredUsers = filteredUsers.filter(user => user.role === role);
    }

    // 按状态过滤
    if (status) {
      filteredUsers = filteredUsers.filter(user => user.status === status);
    }

    // 分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // 移除密码字段
    const safeUsers = paginatedUsers.map(user => {
      const { password, ...safeUser } = user;
      return safeUser;
    });

    res.json({
      success: true,
      data: safeUsers,
      pagination: {
        total: filteredUsers.length,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(filteredUsers.length / limit)
      }
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
 * 获取单个用户
 * GET /api/users/:id
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // 移除密码字段
    const { password, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

/**
 * 创建用户
 * POST /api/users
 */
router.post('/', authenticateToken, authorizeRole(['admin']), validateUserData, async (req, res) => {
  try {
    const { username, email, password, role, organization } = req.body;

    // 检查用户名是否已存在
    const existingUser = users.find(u => u.username === username || u.email === email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Username or email already exists'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建新用户
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password: hashedPassword,
      role,
      organization,
      status: 'active',
      createdAt: new Date(),
      lastLoginAt: null
    };

    users.push(newUser);

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'CREATE_USER',
      resource: 'USER',
      resourceId: newUser.id,
      details: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        organization: newUser.organization
      }
    });

    // 移除密码字段
    const { password: _, ...safeUser } = newUser;

    res.status(201).json({
      success: true,
      data: safeUser,
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

/**
 * 更新用户
 * PUT /api/users/:id
 */
router.put('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { username, email, role, organization, status } = req.body;

    // 检查用户名是否已被其他用户使用
    if (username && username !== user.username) {
      const existingUser = users.find(u => u.username === username && u.id !== req.params.id);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already exists'
        });
      }
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== user.email) {
      const existingUser = users.find(u => u.email === email && u.id !== req.params.id);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }

    // 更新用户信息
    if (username) user.username = username;
    if (email) user.email = email;
    if (role) user.role = role;
    if (organization) user.organization = organization;
    if (status) user.status = status;

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_USER',
      resource: 'USER',
      resourceId: user.id,
      details: req.body
    });

    // 移除密码字段
    const { password, ...safeUser } = user;

    res.json({
      success: true,
      data: safeUser,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

/**
 * 删除用户
 * DELETE /api/users/:id
 */
router.delete('/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const userIndex = users.findIndex(u => u.id === req.params.id);
    
    if (userIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const user = users[userIndex];

    // 不能删除自己
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete yourself'
      });
    }

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'DELETE_USER',
      resource: 'USER',
      resourceId: user.id,
      details: {
        deletedUsername: user.username,
        deletedEmail: user.email
      }
    });

    // 删除用户
    users.splice(userIndex, 1);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

/**
 * 重置用户密码
 * POST /api/users/:id/reset-password
 */
router.post('/:id/reset-password', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const user = users.find(u => u.id === req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        error: 'New password is required'
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    // 记录审计日志
    await logAudit({
      userId: req.user.id,
      action: 'RESET_PASSWORD',
      resource: 'USER',
      resourceId: user.id,
      details: {
        targetUsername: user.username
      }
    });

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password'
    });
  }
});

/**
 * 获取用户统计
 * GET /api/users/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = {
      total: users.length,
      byRole: {},
      byStatus: {},
      active: users.filter(u => u.status === 'active').length,
      inactive: users.filter(u => u.status === 'inactive').length,
      suspended: users.filter(u => u.status === 'suspended').length
    };

    // 按角色统计
    users.forEach(user => {
      stats.byRole[user.role] = (stats.byRole[user.role] || 0) + 1;
      stats.byStatus[user.status] = (stats.byStatus[user.status] || 0) + 1;
    });

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user stats'
    });
  }
});

module.exports = router; 