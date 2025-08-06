const Joi = require('joi');

// 钱包数据验证
const validateWalletData = (req, res, next) => {
  const schema = Joi.object({
    name: Joi.string().min(1).max(100).required().messages({
      'string.empty': '钱包名称不能为空',
      'string.min': '钱包名称至少1个字符',
      'string.max': '钱包名称最多100个字符',
      'any.required': '钱包名称是必填项'
    }),
    chain: Joi.string().valid('bitcoin', 'ethereum', 'bsc', 'polygon').required().messages({
      'any.only': '不支持的区块链类型',
      'any.required': '区块链类型是必填项'
    }),
    threshold: Joi.number().integer().min(1).max(10).required().messages({
      'number.base': '签名阈值必须是数字',
      'number.integer': '签名阈值必须是整数',
      'number.min': '签名阈值至少为1',
      'number.max': '签名阈值最多为10',
      'any.required': '签名阈值是必填项'
    }),
    totalShares: Joi.number().integer().min(2).max(20).required().messages({
      'number.base': '总份额数必须是数字',
      'number.integer': '总份额数必须是整数',
      'number.min': '总份额数至少为2',
      'number.max': '总份额数最多为20',
      'any.required': '总份额数是必填项'
    }),
    participants: Joi.array().items(Joi.string()).min(1).required().messages({
      'array.base': '参与者必须是数组',
      'array.min': '至少需要1个参与者',
      'any.required': '参与者是必填项'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }

  // 验证阈值不能大于总份额数
  if (req.body.threshold > req.body.totalShares) {
    return res.status(400).json({
      success: false,
      error: '签名阈值不能大于总份额数',
      code: 'VALIDATION_ERROR'
    });
  }

  // 验证参与者数量
  if (req.body.participants.length < req.body.threshold) {
    return res.status(400).json({
      success: false,
      error: '参与者数量不能少于签名阈值',
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};

// 交易数据验证
const validateTransactionData = (req, res, next) => {
  const schema = Joi.object({
    walletId: Joi.string().required().messages({
      'string.empty': '钱包ID不能为空',
      'any.required': '钱包ID是必填项'
    }),
    to: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required().messages({
      'string.pattern.base': '接收地址格式无效',
      'any.required': '接收地址是必填项'
    }),
    amount: Joi.string().pattern(/^\d+(\.\d+)?$/).required().messages({
      'string.pattern.base': '金额格式无效',
      'any.required': '金额是必填项'
    }),
    symbol: Joi.string().valid('ETH', 'BTC', 'USDT', 'USDC').required().messages({
      'any.only': '不支持的代币类型',
      'any.required': '代币类型是必填项'
    }),
    gasLimit: Joi.string().pattern(/^\d+$/).optional().messages({
      'string.pattern.base': 'Gas限制格式无效'
    }),
    gasPrice: Joi.string().pattern(/^\d+$/).optional().messages({
      'string.pattern.base': 'Gas价格格式无效'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};

// 用户数据验证
const validateUserData = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(50).pattern(/^[a-zA-Z0-9_]+$/).required().messages({
      'string.empty': '用户名不能为空',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多50个字符',
      'string.pattern.base': '用户名只能包含字母、数字和下划线',
      'any.required': '用户名是必填项'
    }),
    email: Joi.string().email().required().messages({
      'string.email': '邮箱格式无效',
      'any.required': '邮箱是必填项'
    }),
    password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
      'string.empty': '密码不能为空',
      'string.min': '密码至少8个字符',
      'string.pattern.base': '密码必须包含大小写字母和数字',
      'any.required': '密码是必填项'
    }),
    role: Joi.string().valid('admin', 'operator', 'approver', 'viewer').required().messages({
      'any.only': '无效的用户角色',
      'any.required': '用户角色是必填项'
    }),
    organization: Joi.string().min(1).max(100).required().messages({
      'string.empty': '组织名称不能为空',
      'string.min': '组织名称至少1个字符',
      'string.max': '组织名称最多100个字符',
      'any.required': '组织名称是必填项'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};

// 审批数据验证
const validateApprovalData = (req, res, next) => {
  const schema = Joi.object({
    approved: Joi.boolean().required().messages({
      'boolean.base': '审批决定必须是布尔值',
      'any.required': '审批决定是必填项'
    }),
    comment: Joi.string().max(500).optional().messages({
      'string.max': '审批意见最多500个字符'
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
      code: 'VALIDATION_ERROR'
    });
  }

  next();
};

module.exports = {
  validateWalletData,
  validateTransactionData,
  validateUserData,
  validateApprovalData
}; 