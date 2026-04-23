# MPC 钱包技术原理详解

## 项目概述

这是一个基于**多方计算（MPC）**技术的以太坊钱包教学实现，采用 **3方参与、门限2-of-3** 的安全模型。项目实现了完整的 MPC 钱包功能，包括分布式密钥生成、门限签名、分层确定性地址派生等。

---

## 核心技术栈

### 1. MPC (Multi-Party Computation) - 多方计算

**定义**：一种密码学技术，允许多个参与方在不暴露各自私密输入的情况下，共同计算某个函数的结果。

**在本项目中的应用**：
- 三方各自持有私钥分片，没有任何一方知道完整的私钥
- 签名时需要至少两方协作，但完整私钥永远不会被重建
- 提供**信息论安全**：即使攻击者获得单方的所有数据，也无法推断私钥

### 2. DKG (Distributed Key Generation) - 分布式密钥生成

**定义**：一种无需可信第三方（Dealer）的协议，让多个参与方共同生成公钥/私钥对，每个参与方只获得私钥的一个分片。

**本项目实现**：Pedersen DKG 协议（无 Dealer 模式）

**协议流程（3方，门限2）**：
```
阶段1：各方生成本地多项式
  - 每方 i 选择随机 t-1 次多项式 fᵢ(x) = aᵢ₀ + aᵢ₁x + ... + aᵢₜ₋₁xᵗ⁻¹（t=2时为一次直线：fᵢ(x) = aᵢ₀ + aᵢ₁x）
  - 计算并广播承诺 Cᵢⱼ = aᵢⱼ · G（椭圆曲线点）

阶段2：发送私密分片
  - 每方 i 计算给其他方 j 的分片：sᵢⱼ = fᵢ(j)
  - 通过加密信道秘密发送

阶段3：验证并聚合
  - 每方验证收到的分片与承诺一致（Feldman VSS验证）
  - 聚合所有分片：xⱼ = Σᵢ sᵢⱼ（最终私钥分片）
```

**关键特性**：
- 全局公钥 P = Σᵢ aᵢ₀ · G 可被所有人计算
- 完整私钥 F(0) = Σᵢ aᵢ₀ 从未被任何方持有或计算

### 3. VSS (Verifiable Secret Sharing) - 可验证秘密共享

**定义**：Shamir 秘密共享的扩展，允许接收方验证收到的分片是否来自发送方承诺的多项式。

**本项目实现**：Feldman VSS

**数学原理**：
```
发送方：
  - 多项式 f(x) = a₀ + a₁x + a₂x² + ...
  - 公开承诺 Cⱼ = aⱼ · G（椭圆曲线点）

验证等式：
  shard · G == Σₖ Cₖ · jᵏ

即：f(j) · G == a₀·G + a₁·G·j + a₂·G·j² + ...
```

**作用**：防止恶意方发送无效分片，确保 DKG 的正确性。

### 4. TSS (Threshold Signature Scheme) - 门限签名方案

**定义**：一种数字签名方案，需要至少 t 个参与方协作才能生成有效签名，少于 t 个参与方无法获得任何关于私钥的信息。

**本项目实现**：基于 Lindell 2017 的两方 ECDSA 签名

**数学挑战**：
```
标准 ECDSA: s = k⁻¹·(m + r·x) mod n

问题：
  - k（nonce）和 x（私钥）都以分片形式存储
  - (k₁+k₂)⁻¹ ≠ k₁⁻¹ + k₂⁻¹，加法分享无法直接分解

解决方案（乘法 k 分享 + 加法 x 分享）：
  - 密钥 x：Shamir DKG → 用拉格朗日系数转为加法分片 x̂ᵢ = λᵢ·xᵢ
  - Nonce k：乘法分享 k = kA·kB，无需重建即可计算 R = k·G
```

**签名协议（2轮）**：
```
轮次1：方 A → 方 B
  R_A = kA·G

轮次2：方 B 计算
  R = kB·R_A = k·G
  r = R.x mod n
  γ_B = kB⁻¹·(m + r·x̂_B)      ← 方 B 的贡献
  δ_B = kB⁻¹·r·x̂_A              ← 方 A 的 x 份额（通过 MtA 安全计算）

轮次3：方 A 本地计算
  s = kA⁻¹·(γ_B + δ_B) = k⁻¹·(m + r·x)  ✓
```

**关键特性**：产生的签名与普通 ECDSA 签名在数学上完全等价，链上无法区分。

### 5. HD Wallet (BIP-32) - 分层确定性钱包

**定义**：一种从一个种子密钥派生出层级结构私钥/公钥的标准协议。

**本项目实现**：公钥侧派生（无需私钥参与）

**核心原理**：
```
普通 HD（需要私钥）：
  child_privkey = parent_privkey + HMAC(parent_pubkey, chaincode, index)

公钥侧派生（仅需公钥）：
  child_pubkey = parent_pubkey + HMAC(parent_pubkey, chaincode, index) · G
```

**对 MPC 的意义**：
- MPC 生成的公钥 P 和链码对外公开
- 服务端可无限派生子地址，无需触发 MPC 协议
- 只有花费子地址资金时，才需要各方协作签名

**派生路径示例**：
```
m/0/{orderId}  →  按订单 ID 派生的收款地址
m/0/1001       →  订单 #1001 的专属收款地址
```

### 6. 椭圆曲线 secp256k1

**定义**：比特币和以太坊使用的椭圆曲线，定义在有限域 Fₙ 上。

**曲线参数**：
```
阶 n = FFFFFFFF FFFFFFFF FFFFFFFF FFFFFFFE BAAEDCE6 AF48A03B BFD25E8C D0364141
生成元 G（基点）
所有私钥运算都在 mod n 的域上进行
```

**本项目使用的运算**：
- 标量乘法：scalar * G
- 点加法：P + Q
- 模运算：mod n

### 7. 相关密码学协议

#### MtA (Multiplication-to-Addition)
- **定义**：将乘法分享转换为加法分享的子协议
- **实现方式**：Paillier 同态加密（GG18/GG20）或 OT（DKLS23）
- **作用**：在 TSS 签名中安全计算涉及多方秘密的项

#### 拉格朗日插值
- **定义**：从 t 个点重构 t-1 次多项式的方法
- **公式**：f(0) = Σᵢ yᵢ · λᵢ(0)，其中 λᵢ(0) = Π_{j≠i} (-j)/(i-j)
- **作用**：从私钥分片恢复完整私钥（仅用于教学验证）

#### EIP-155
- **定义**：以太坊交易签名标准，包含链 ID 以防止重放攻击
- **v 值计算**：v = chainId × 2 + 35/36

---

## 关键安全特性

### 1. 信息论安全
在 2-of-3 方案中：
- 单个分片对应无限多条可能的直线
- 每条直线在 x=0 处的值不同
- 攻击者无法从单片推断私钥，不依赖计算困难假设

### 2. 链上不可区分性
- MPC 产生的 (r, s) 签名与普通私钥签名在数学上等价
- 区块链无法区分是 MPC 还是单私钥签名

### 3. 无单点故障
- 任何一方被攻破，攻击者只能获得一个分片
- 需要至少两方合谋才能恢复私钥

---

## 项目结构

```
mpc-wallet/
├── src/
│   ├── field.js      # 有限域运算 & 椭圆曲线辅助函数
│   ├── vss.js        # Feldman 可验证秘密共享
│   ├── dkg.js        # 无 Dealer 分布式密钥生成
│   ├── tss.js        # 门限 ECDSA 签名
│   ├── hdwallet.js   # 公钥侧 HD 派生
│   ├── transaction.js # 以太坊交易构造
│   └── wallet.js     # MPC 钱包 API 编排器
├── index.js          # 完整演示入口
└── package.json      # 项目配置
```

---

## 依赖库

- **@noble/curves**: 纯 JavaScript 实现的 secp256k1 椭圆曲线
- **@noble/hashes**: 密码学哈希函数（SHA-256、Keccak-256、HMAC）

---

## 参考协议与论文

1. **Lindell 2017**: [Fast Secure Two-Party ECDSA Signing](https://eprint.iacr.org/2017/552)
2. **GG18**: [Secure Multi-Party Computation for ECDSA](https://eprint.iacr.org/2019/114)
3. **CGGMP21**: [UC Non-Interactive, Proactive, Threshold ECDSA](https://eprint.iacr.org/2021/060)
4. **DKLS23**: [ threshold Schnorr and ECDSA signatures](https://eprint.iacr.org/2023/XXX)
5. **BIP-32**: Hierarchical Deterministic Wallets
6. **EIP-155**: Simple Replay Attack Protection
7. **EIP-2**: Homestead Hard-fork Changes（低 s 值规范化）

---

## 生产环境迁移建议

1. **DKG/TSS**: 替换为经审计的实现（如 @silencelaboratories/dkls-wasm-ll-node）
2. **加密信道**: 各方通信使用 TLS + 消息加密（如 ECIES）
3. **HD 派生**: 替换为完整 BIP-32 实现（使用 HMAC-SHA512）
4. **交易编码**: 使用 @ethereumjs/tx 处理完整 EIP-1559/EIP-2930 支持
5. **分片存储**: 使用 HSM 或 TEE 保护各方的密钥分片

---

## 运行演示

```bash
# 安装依赖
npm install

# 运行完整演示
npm start

# 单独运行各演示
npm run demo:dkg       # DKG 密钥生成
npm run demo:hd        # HD 地址派生
npm run demo:sign      # 消息签名
npm run demo:transfer  # ETH 转账
npm run demo:security  # 安全验证
```
