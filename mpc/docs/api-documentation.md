# MPC钱包API文档

## 概述

本文档描述了MPC钱包系统的RESTful API接口。所有API都使用JSON格式进行数据交换，并使用JWT进行身份验证。

**基础URL**: `https://api.mpcwallet.com/v1`

**认证方式**: Bearer Token

## 通用响应格式

### 成功响应
```json
{
  "success": true,
  "data": {...},
  "message": "操作成功"
}
```

### 错误响应
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

## 认证相关API

### 用户登录
**POST** `/api/auth/login`

**请求参数**:
```json
{
  "username": "string",
  "password": "string"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "username": "username",
      "email": "email",
      "role": "admin",
      "status": "active"
    }
  }
}
```

### 用户注册
**POST** `/api/auth/register`

**请求参数**:
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "organization": "string"
}
```

### 刷新令牌
**POST** `/api/auth/refresh`

**请求头**:
```
Authorization: Bearer <refresh_token>
```

## 钱包管理API

### 获取钱包列表
**GET** `/api/wallets`

**请求头**:
```
Authorization: Bearer <token>
```

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `status`: 钱包状态过滤
- `chain`: 区块链类型过滤

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "wallet_id",
      "name": "钱包名称",
      "address": "0x...",
      "chain": "ethereum",
      "threshold": 2,
      "totalShares": 3,
      "status": "active",
      "balance": [
        {
          "symbol": "ETH",
          "balance": "1.23456789",
          "decimals": 18,
          "usdValue": 1234.56
        }
      ],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 创建钱包
**POST** `/api/wallets`

**请求参数**:
```json
{
  "name": "钱包名称",
  "chain": "ethereum",
  "threshold": 2,
  "totalShares": 3,
  "participants": ["user_id_1", "user_id_2", "user_id_3"]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "wallet_id",
    "name": "钱包名称",
    "address": "0x...",
    "chain": "ethereum",
    "threshold": 2,
    "totalShares": 3,
    "participants": ["user_id_1", "user_id_2", "user_id_3"],
    "status": "active",
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "钱包创建成功"
}
```

### 获取钱包详情
**GET** `/api/wallets/:id`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "wallet_id",
    "name": "钱包名称",
    "address": "0x...",
    "chain": "ethereum",
    "threshold": 2,
    "totalShares": 3,
    "participants": ["user_id_1", "user_id_2", "user_id_3"],
    "status": "active",
    "balance": [...],
    "shares": [
      {
        "id": "share_id",
        "userId": "user_id",
        "shareIndex": 1,
        "status": "active",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 更新钱包
**PUT** `/api/wallets/:id`

**请求参数**:
```json
{
  "name": "新钱包名称",
  "status": "inactive"
}
```

### 获取钱包余额
**GET** `/api/wallets/:id/balance`

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "symbol": "ETH",
      "balance": "1.23456789",
      "decimals": 18,
      "usdValue": 1234.56
    },
    {
      "symbol": "USDT",
      "balance": "1000.00",
      "decimals": 6,
      "usdValue": 1000.00
    }
  ]
}
```

### 份额轮换
**POST** `/api/wallets/:id/refresh-shares`

**请求参数**:
```json
{
  "newThreshold": 3,
  "newTotalShares": 5,
  "newParticipants": ["user_id_1", "user_id_2", "user_id_3", "user_id_4", "user_id_5"]
}
```

## 交易管理API

### 获取交易列表
**GET** `/api/transactions`

**查询参数**:
- `page`: 页码 (默认: 1)
- `limit`: 每页数量 (默认: 10)
- `status`: 交易状态过滤
- `walletId`: 钱包ID过滤

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "transaction_id",
      "walletId": "wallet_id",
      "txHash": "0x...",
      "from": "0x...",
      "to": "0x...",
      "amount": "0.1",
      "symbol": "ETH",
      "status": "pending",
      "type": "send",
      "signatures": [...],
      "approvals": [...],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 创建交易
**POST** `/api/transactions`

**请求参数**:
```json
{
  "walletId": "wallet_id",
  "to": "0x...",
  "amount": "0.1",
  "symbol": "ETH",
  "gasLimit": "21000",
  "gasPrice": "20000000000"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "transaction_id",
    "walletId": "wallet_id",
    "txHash": null,
    "from": "0x...",
    "to": "0x...",
    "amount": "0.1",
    "symbol": "ETH",
    "status": "pending",
    "type": "send",
    "signatures": [],
    "approvals": [],
    "createdAt": "2024-01-01T00:00:00Z"
  },
  "message": "交易创建成功，等待审批"
}
```

### 审批交易
**POST** `/api/transactions/:id/approve`

**请求参数**:
```json
{
  "approved": true,
  "comment": "审批意见"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "transaction_id",
    "status": "approved",
    "approvals": [
      {
        "id": "approval_id",
        "userId": "user_id",
        "username": "username",
        "approved": true,
        "comment": "审批意见",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "message": "交易审批通过"
}
```

### 签名交易
**POST** `/api/transactions/:id/sign`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "transaction_id",
    "status": "signed",
    "signatures": [
      {
        "id": "signature_id",
        "userId": "user_id",
        "username": "username",
        "signature": "0x...",
        "timestamp": "2024-01-01T00:00:00Z"
      }
    ]
  },
  "message": "交易签名成功"
}
```

### 获取交易详情
**GET** `/api/transactions/:id`

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "transaction_id",
    "walletId": "wallet_id",
    "txHash": "0x...",
    "from": "0x...",
    "to": "0x...",
    "amount": "0.1",
    "symbol": "ETH",
    "status": "confirmed",
    "type": "send",
    "signatures": [...],
    "approvals": [...],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

### 获取交易统计
**GET** `/api/transactions/stats`

**响应**:
```json
{
  "success": true,
  "data": {
    "total": 100,
    "pending": 10,
    "approved": 20,
    "signed": 15,
    "confirmed": 50,
    "failed": 3,
    "rejected": 2
  }
}
```

### 取消交易
**POST** `/api/transactions/:id/cancel`

**请求参数**:
```json
{
  "reason": "取消原因"
}
```

## 用户管理API

### 获取用户列表
**GET** `/api/users`

**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `role`: 角色过滤
- `status`: 状态过滤

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "username": "username",
      "email": "email@example.com",
      "role": "admin",
      "organization": "组织名称",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z",
      "lastLoginAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### 创建用户
**POST** `/api/users`

**请求参数**:
```json
{
  "username": "username",
  "email": "email@example.com",
  "password": "password",
  "role": "operator",
  "organization": "组织名称"
}
```

### 更新用户
**PUT** `/api/users/:id`

**请求参数**:
```json
{
  "role": "approver",
  "status": "active"
}
```

### 删除用户
**DELETE** `/api/users/:id`

## MPC相关API

### 获取MPC配置
**GET** `/api/mpc/config`

**响应**:
```json
{
  "success": true,
  "data": {
    "algorithm": "shamir",
    "keyType": "secp256k1",
    "encryption": "AES-256-GCM",
    "communication": "TLS-1.3"
  }
}
```

### 验证份额
**POST** `/api/mpc/verify-shares`

**请求参数**:
```json
{
  "walletId": "wallet_id",
  "shares": [
    {
      "index": 1,
      "value": "encrypted_share_value"
    }
  ]
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "valid": true,
    "threshold": 2,
    "totalShares": 3
  }
}
```

### 份额备份
**POST** `/api/mpc/backup-shares`

**请求参数**:
```json
{
  "walletId": "wallet_id",
  "backupType": "encrypted_file"
}
```

## 审计日志API

### 获取审计日志
**GET** `/api/audit/logs`

**查询参数**:
- `page`: 页码
- `limit`: 每页数量
- `userId`: 用户ID过滤
- `action`: 操作类型过滤
- `resource`: 资源类型过滤
- `startDate`: 开始日期
- `endDate`: 结束日期

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "log_id",
      "userId": "user_id",
      "username": "username",
      "action": "CREATE_WALLET",
      "resource": "WALLET",
      "resourceId": "wallet_id",
      "details": {
        "walletName": "钱包名称",
        "chain": "ethereum"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "total": 1000,
    "page": 1,
    "limit": 10,
    "totalPages": 100
  }
}
```

### 导出审计日志
**GET** `/api/audit/export`

**查询参数**:
- `format`: 导出格式 (csv, json, pdf)
- `startDate`: 开始日期
- `endDate`: 结束日期

## WebSocket API

### 连接WebSocket
**URL**: `wss://api.mpcwallet.com/ws`

**认证**: 通过查询参数传递JWT令牌
```
wss://api.mpcwallet.com/ws?token=<jwt_token>
```

### 事件类型

#### 钱包事件
```json
{
  "type": "wallet-created",
  "data": {
    "walletId": "wallet_id",
    "walletName": "钱包名称"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 交易事件
```json
{
  "type": "transaction-created",
  "data": {
    "transactionId": "transaction_id",
    "walletId": "wallet_id",
    "amount": "0.1",
    "symbol": "ETH"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 审批事件
```json
{
  "type": "transaction-approved",
  "data": {
    "transactionId": "transaction_id",
    "approved": true,
    "newStatus": "approved"
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 签名事件
```json
{
  "type": "transaction-signed",
  "data": {
    "transactionId": "transaction_id",
    "signatureCount": 2,
    "threshold": 2
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

#### 确认事件
```json
{
  "type": "transaction-confirmed",
  "data": {
    "transactionId": "transaction_id",
    "txHash": "0x..."
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### 客户端事件

#### 加入房间
```json
{
  "type": "join-wallet",
  "data": {
    "walletId": "wallet_id"
  }
}
```

```json
{
  "type": "join-transaction",
  "data": {
    "transactionId": "transaction_id"
  }
}
```

## 错误代码

| 错误代码 | 描述 | HTTP状态码 |
|----------|------|------------|
| `INVALID_TOKEN` | 无效的认证令牌 | 401 |
| `ACCESS_DENIED` | 访问被拒绝 | 403 |
| `RESOURCE_NOT_FOUND` | 资源不存在 | 404 |
| `VALIDATION_ERROR` | 参数验证失败 | 400 |
| `INSUFFICIENT_PERMISSIONS` | 权限不足 | 403 |
| `WALLET_NOT_FOUND` | 钱包不存在 | 404 |
| `TRANSACTION_NOT_FOUND` | 交易不存在 | 404 |
| `INSUFFICIENT_BALANCE` | 余额不足 | 400 |
| `INVALID_SIGNATURE` | 签名无效 | 400 |
| `MPC_ERROR` | MPC协议错误 | 500 |
| `BLOCKCHAIN_ERROR` | 区块链网络错误 | 500 |

## 速率限制

API请求受到速率限制：

- **认证API**: 每分钟10次
- **钱包API**: 每分钟100次
- **交易API**: 每分钟50次
- **用户API**: 每分钟20次
- **审计API**: 每分钟30次

超过限制时返回：
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

## 版本控制

API版本通过URL路径控制：
- 当前版本: `/api/v1/`
- 未来版本: `/api/v2/`

## 更新日志

### v1.0.0 (2024-01-01)
- 初始版本发布
- 支持基本的钱包和交易管理
- 实现MPC密钥分割和签名
- 添加WebSocket实时通信
- 完整的审计日志系统 