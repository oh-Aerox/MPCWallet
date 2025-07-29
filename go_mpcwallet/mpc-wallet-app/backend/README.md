# MPC Wallet Backend
## todo
替换mpc中网络通信部分，实现mocknet数据以字符串方式返回到前端

基于 Go 和 Coinbase MPC 库实现的多方计算钱包后端服务。

## 功能特性

### 1. 多方钱包创建
- 支持创建 MPC 钱包会话
- 生成密钥分片
- 管理钱包创建状态

### 2. 多方钱包加入
- 支持其他参与方加入已创建的钱包
- 验证加入请求
- 分配密钥分片

### 3. 交易签名
- 支持多方签名交易
- 验证交易参数
- 广播已签名交易

### 4. Session 管理
- 管理钱包创建和加入的会话状态
- 跟踪参与方状态
- 维护会话生命周期

## 项目结构

```
backend/
├── main.go              # 主入口文件
├── mpc/
│   ├── service.go       # MPC 服务实现
│   ├── session.go       # Session 管理
│   └── handlers.go      # API 处理器
├── config/
│   └── config.go        # 配置文件
└── README.md           # 项目文档
```

## API 接口

### 1. 创建钱包会话
```http
POST /api/mpc/create-session
Content-Type: application/json

{
    "creator": "user_id"
}
```

### 2. 加入钱包会话
```http
POST /api/mpc/join-session
Content-Type: application/json

{
    "session_id": "session_id",
    "member": "user_id"
}
```

### 3. 查询会话状态
```http
GET /api/mpc/session-status?session_id=xxx
```

### 4. 签名交易
```http
POST /api/mpc/sign-tx
Content-Type: application/json

{
    "to": "0x...",
    "value": "1000000000000000000",
    "session_id": "session_id"
}
```

## 环境要求

- Go 1.18+
- 以太坊节点（如 Infura）
- 必要的系统依赖

## 配置说明

1. 创建配置文件 `config/config.yaml`：
```yaml
server:
  port: 8080
  cors:
    allowed_origins:
      - http://localhost:3000

ethereum:
  network: mainnet
  infura_url: "https://mainnet.infura.io/v3/YOUR-PROJECT-ID"

mpc:
  min_participants: 2
  timeout: 300 # seconds
```

## 启动服务

1. 安装依赖：
```bash
go mod download
```

2. 编译项目：
```bash
go build -o mpc-wallet
```

3. 运行服务：
```bash
./mpc-wallet
```

或者直接运行：
```bash
go run main.go
```

## 开发说明

### 添加新功能
1. 在 `mpc` 包中添加新的服务实现
2. 在 `handlers.go` 中添加对应的处理器
3. 在 `main.go` 中注册新的路由

### 测试
```bash
go test ./...
```

### 部署
1. 确保配置文件正确
2. 编译项目
3. 使用进程管理工具（如 systemd）运行服务

## 安全说明

1. 密钥分片安全存储
2. API 访问控制
3. 交易签名验证
4. 会话状态管理

## 注意事项

1. 生产环境部署前请确保：
   - 配置文件安全
   - 网络访问控制
   - 日志记录完整
   - 监控告警配置

2. 开发环境：
   - 使用测试网络
   - 启用详细日志
   - 配置跨域访问 