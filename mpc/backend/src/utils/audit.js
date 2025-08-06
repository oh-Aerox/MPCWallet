const { v4: uuidv4 } = require('uuid');

// 模拟审计日志存储
let auditLogs = [];

/**
 * 记录审计日志
 * @param {Object} logData - 日志数据
 * @param {string} logData.userId - 用户ID
 * @param {string} logData.action - 操作类型
 * @param {string} logData.resource - 资源类型
 * @param {string} logData.resourceId - 资源ID
 * @param {Object} logData.details - 详细信息
 * @param {string} logData.ipAddress - IP地址
 * @param {string} logData.userAgent - 用户代理
 */
const logAudit = async (logData) => {
  try {
    const auditLog = {
      id: uuidv4(),
      userId: logData.userId,
      username: logData.username || 'unknown',
      action: logData.action,
      resource: logData.resource,
      resourceId: logData.resourceId,
      details: logData.details || {},
      ipAddress: logData.ipAddress || 'unknown',
      userAgent: logData.userAgent || 'unknown',
      timestamp: new Date()
    };

    // 添加到内存存储（实际应用中应该存储到数据库）
    auditLogs.push(auditLog);

    // 限制日志数量，避免内存溢出
    if (auditLogs.length > 10000) {
      auditLogs = auditLogs.slice(-5000);
    }

    console.log('Audit Log:', auditLog);
  } catch (error) {
    console.error('Error logging audit:', error);
  }
};

/**
 * 获取审计日志
 * @param {Object} filters - 过滤条件
 * @param {string} filters.userId - 用户ID
 * @param {string} filters.action - 操作类型
 * @param {string} filters.resource - 资源类型
 * @param {Date} filters.startDate - 开始日期
 * @param {Date} filters.endDate - 结束日期
 * @param {number} filters.page - 页码
 * @param {number} filters.limit - 每页数量
 */
const getAuditLogs = async (filters = {}) => {
  try {
    let filteredLogs = [...auditLogs];

    // 应用过滤条件
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters.action) {
      filteredLogs = filteredLogs.filter(log => log.action === filters.action);
    }

    if (filters.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
    }

    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate);
    }

    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate);
    }

    // 按时间倒序排列
    filteredLogs.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    return {
      data: paginatedLogs,
      pagination: {
        total: filteredLogs.length,
        page,
        limit,
        totalPages: Math.ceil(filteredLogs.length / limit)
      }
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    throw error;
  }
};

/**
 * 导出审计日志
 * @param {Object} filters - 过滤条件
 * @param {string} format - 导出格式 (csv, json, pdf)
 */
const exportAuditLogs = async (filters = {}, format = 'json') => {
  try {
    const { data } = await getAuditLogs(filters);

    switch (format.toLowerCase()) {
      case 'csv':
        return exportToCSV(data);
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'pdf':
        return exportToPDF(data);
      default:
        throw new Error('Unsupported export format');
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
};

/**
 * 导出为CSV格式
 */
const exportToCSV = (data) => {
  const headers = ['ID', '用户ID', '用户名', '操作', '资源', '资源ID', 'IP地址', '时间'];
  const rows = data.map(log => [
    log.id,
    log.userId,
    log.username,
    log.action,
    log.resource,
    log.resourceId,
    log.ipAddress,
    log.timestamp.toISOString()
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  return csvContent;
};

/**
 * 导出为PDF格式（简化实现）
 */
const exportToPDF = (data) => {
  // 这里应该使用真实的PDF生成库
  // 目前返回简化的文本格式
  const pdfContent = data.map(log => 
    `${log.timestamp.toISOString()} - ${log.username} - ${log.action} - ${log.resource}`
  ).join('\n');

  return pdfContent;
};

/**
 * 清理旧日志
 * @param {number} daysToKeep - 保留天数
 */
const cleanupOldLogs = async (daysToKeep = 90) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const originalCount = auditLogs.length;
    auditLogs = auditLogs.filter(log => log.timestamp > cutoffDate);
    const removedCount = originalCount - auditLogs.length;

    console.log(`Cleaned up ${removedCount} old audit logs`);
    return removedCount;
  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    throw error;
  }
};

/**
 * 获取审计统计信息
 */
const getAuditStats = async () => {
  try {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      total: auditLogs.length,
      last24Hours: auditLogs.filter(log => log.timestamp > last24Hours).length,
      last7Days: auditLogs.filter(log => log.timestamp > last7Days).length,
      last30Days: auditLogs.filter(log => log.timestamp > last30Days).length,
      byAction: {},
      byResource: {},
      byUser: {}
    };

    // 按操作类型统计
    auditLogs.forEach(log => {
      stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
      stats.byResource[log.resource] = (stats.byResource[log.resource] || 0) + 1;
      stats.byUser[log.username] = (stats.byUser[log.username] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting audit stats:', error);
    throw error;
  }
};

module.exports = {
  logAudit,
  getAuditLogs,
  exportAuditLogs,
  cleanupOldLogs,
  getAuditStats
}; 