const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { getAuditLogs, exportAuditLogs, getAuditStats, cleanupOldLogs } = require('../utils/audit');

/**
 * 获取审计日志
 * GET /api/audit/logs
 */
router.get('/logs', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      userId, 
      action, 
      resource, 
      startDate, 
      endDate 
    } = req.query;

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      userId,
      action,
      resource,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    const result = await getAuditLogs(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs'
    });
  }
});

/**
 * 导出审计日志
 * GET /api/audit/export
 */
router.get('/export', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { 
      format = 'json', 
      startDate, 
      endDate,
      userId,
      action,
      resource
    } = req.query;

    const filters = {
      userId,
      action,
      resource,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    const exportData = await exportAuditLogs(filters, format);

    // 设置响应头
    const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
    } else {
      res.setHeader('Content-Type', 'text/plain');
    }

    res.send(exportData);
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs'
    });
  }
});

/**
 * 获取审计统计
 * GET /api/audit/stats
 */
router.get('/stats', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const stats = await getAuditStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit stats'
    });
  }
});

/**
 * 清理旧日志
 * POST /api/audit/cleanup
 */
router.post('/cleanup', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { daysToKeep = 90 } = req.body;

    const removedCount = await cleanupOldLogs(daysToKeep);

    res.json({
      success: true,
      data: {
        removedCount,
        daysKept: daysToKeep
      },
      message: `Cleaned up ${removedCount} old audit logs`
    });
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup audit logs'
    });
  }
});

/**
 * 获取审计日志详情
 * GET /api/audit/logs/:id
 */
router.get('/logs/:id', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;

    // 这里应该从数据库获取特定的日志记录
    // 目前返回模拟数据
    const logEntry = {
      id,
      userId: '1',
      username: 'admin',
      action: 'CREATE_WALLET',
      resource: 'WALLET',
      resourceId: 'wallet_123',
      details: {
        walletName: '测试钱包',
        chain: 'ethereum',
        threshold: 2,
        totalShares: 3
      },
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      timestamp: new Date()
    };

    res.json({
      success: true,
      data: logEntry
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log'
    });
  }
});

/**
 * 搜索审计日志
 * POST /api/audit/search
 */
router.post('/search', authenticateToken, authorizeRole(['admin']), async (req, res) => {
  try {
    const { 
      query, 
      page = 1, 
      limit = 10,
      startDate,
      endDate,
      userId,
      action,
      resource
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const filters = {
      page: parseInt(page),
      limit: parseInt(limit),
      query,
      userId,
      action,
      resource,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    };

    // 这里应该实现搜索逻辑
    // 目前返回模拟搜索结果
    const searchResults = {
      data: [
        {
          id: '1',
          userId: '1',
          username: 'admin',
          action: 'CREATE_WALLET',
          resource: 'WALLET',
          resourceId: 'wallet_123',
          details: {
            walletName: '测试钱包',
            chain: 'ethereum'
          },
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          timestamp: new Date()
        }
      ],
      pagination: {
        total: 1,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: 1
      }
    };

    res.json({
      success: true,
      data: searchResults.data,
      pagination: searchResults.pagination
    });
  } catch (error) {
    console.error('Error searching audit logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search audit logs'
    });
  }
});

/**
 * 获取审计日志类型
 * GET /api/audit/actions
 */
router.get('/actions', authenticateToken, async (req, res) => {
  try {
    const actions = [
      'CREATE_WALLET',
      'UPDATE_WALLET',
      'DELETE_WALLET',
      'CREATE_TRANSACTION',
      'APPROVE_TRANSACTION',
      'SIGN_TRANSACTION',
      'CREATE_USER',
      'UPDATE_USER',
      'DELETE_USER',
      'LOGIN',
      'LOGOUT',
      'VERIFY_SHARES',
      'BACKUP_SHARES',
      'RESTORE_SHARES',
      'ROTATE_SHARES'
    ];

    res.json({
      success: true,
      data: actions
    });
  } catch (error) {
    console.error('Error fetching audit actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit actions'
    });
  }
});

/**
 * 获取审计资源类型
 * GET /api/audit/resources
 */
router.get('/resources', authenticateToken, async (req, res) => {
  try {
    const resources = [
      'WALLET',
      'TRANSACTION',
      'USER',
      'MPC',
      'AUTH'
    ];

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('Error fetching audit resources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit resources'
    });
  }
});

module.exports = router; 