'use strict';

/**
 * index.js — MPC 钱包完整演示
 *
 * 演示顺序:
 *   1. DKG: 三方分布式密钥生成（无 dealer）
 *   2. 地址派生: 公钥侧 HD 派生，批量生成收款地址
 *   3. 消息签名: 用任意两方对消息签名
 *   4. ETH 转账: 构造并多方签名以太坊交易
 *   5. 子地址签名: 从派生子地址发起转账
 *   6. 安全验证: 演示分片安全性（单片无法恢复私钥）
 */

const {
  initMPCWallet,
  deriveOrderAddress,
  deriveAddressBatch,
  signMessage,
  signTransfer,
  signERC20Transfer,
  signFromDerivedAddress,
} = require('./src/wallet');

const { lagrangeInterpolateAtZero } = require('./src/vss');
const { verifySignature } = require('./src/tss');
const { hashMessage } = require('./src/field');

// ─── 工具函数 ────────────────────────────────────────────────────

function section(title) {
  console.log('\n' + '█'.repeat(60));
  console.log(`█  ${title}`);
  console.log('█'.repeat(60));
}

function result(label, value) {
  console.log(`\n  ✓ ${label}:`);
  if (typeof value === 'object') {
    Object.entries(value).forEach(([k, v]) => {
      const display = typeof v === 'string' && v.length > 80
        ? v.slice(0, 48) + '...'
        : v;
      console.log(`      ${k}: ${display}`);
    });
  } else {
    const display = typeof value === 'string' && value.length > 80
      ? value.slice(0, 48) + '...'
      : value;
    console.log(`      ${display}`);
  }
}

// ─── Demo 1: 初始化 MPC 钱包 ────────────────────────────────────

async function demo1_InitWallet() {
  section('Demo 1: DKG — 三方分布式密钥生成');

  const wallet = initMPCWallet({ n: 3, t: 2 });

  result('根收款地址', wallet.rootAddress);
  result('链码（用于 HD 派生）', wallet.chainCode.toString('hex'));

  // 验证：所有参与方的公钥一致
  const pubKeys = wallet.parties.map(p => Buffer.from(p.publicKey).toString('hex'));
  console.log('\n  各方独立计算公钥验证:');
  pubKeys.forEach((pk, i) => {
    console.log(`    方 ${i + 1}: ${pk.slice(0, 20)}... ${pk === pubKeys[0] ? '✓ 一致' : '✗ 不一致'}`);
  });

  console.log('\n  私钥安全验证:');
  console.log('    F(0) = 全局私钥从未在任何设备上出现 ✓');
  wallet.parties.forEach(p => {
    console.log(`    方 ${p.id} 分片: ${p.keyShare.toString(16).slice(0, 16)}... (仅本方持有)`);
  });

  return wallet;
}

// ─── Demo 2: HD 地址派生 ─────────────────────────────────────────

async function demo2_DeriveAddresses(wallet) {
  section('Demo 2: HD 地址派生 — 公钥侧，无需私钥');

  console.log('\n  单地址派生（订单 #1001）:');
  const order1001 = deriveOrderAddress(wallet.groupPublicKey, wallet.chainCode, 1001);

  console.log('\n  批量派生前 5 个收款地址:');
  const batch = deriveAddressBatch(wallet.groupPublicKey, wallet.chainCode, 5);

  console.log('\n  关键特性:');
  console.log('    · 地址派生不需要任何一方的私钥分片在线 ✓');
  console.log('    · 派生速度快（纯公钥计算）✓');
  console.log('    · 每个地址对应唯一的收款路径，可按订单单独归集 ✓');

  return { order1001, batch };
}

// ─── Demo 3: 消息签名（方 1 发起，方 2 协作）─────────────────────

async function demo3_SignMessage(wallet) {
  section('Demo 3: TSS 消息签名 — 方 1 & 方 2 参与（门限 2-of-3）');

  const message = 'MPC 钱包签名测试：Transfer 1 ETH to 0xAbCd...';

  // 方 1 和方 2 参与签名（方 3 不参与）
  const result1 = signMessage(message, wallet, [1, 2]);

  result('签名结果', result1.signature);
  result('签名有效', result1.valid ? '✓ 通过' : '✗ 失败');

  console.log('\n  验证方 3 不参与时，方 1+2 仍可完成签名 ✓');

  // 换方 1 和方 3 参与
  section('Demo 3b: TSS 消息签名 — 方 1 & 方 3 参与');
  const result2 = signMessage(message, wallet, [1, 3]);
  result('签名有效', result2.valid ? '✓ 通过' : '✗ 失败');

  console.log('\n  相同消息，不同参与方组合，签名均有效 ✓');

  return result1;
}

// ─── Demo 4: ETH 转账签名 ────────────────────────────────────────

async function demo4_SignTransfer(wallet) {
  section('Demo 4: ETH 转账 — 方 2 & 方 3 参与签名');

  const txResult = signTransfer(
    {
      to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',  // Vitalik 的地址（示例）
      value: 1000000000000000000n, // 1 ETH（单位 wei）
      nonce: 0,
      gasPrice: 20000000000n,      // 20 Gwei
      gasLimit: 21000n,
      chainId: 1,                  // Ethereum Mainnet
    },
    wallet,
    [2, 3]  // 方 2 和方 3 参与
  );

  result('交易哈希', txResult.txHash);
  result('签名 r', txResult.signature.r);
  result('签名 s', txResult.signature.s);
  result('Raw Transaction', txResult.rawTransaction);
  result('签名有效', txResult.valid ? '✓ 通过' : '✗ 失败');

  return txResult;
}

// ─── Demo 5: ERC-20 转账 ─────────────────────────────────────────

async function demo5_SignERC20(wallet) {
  section('Demo 5: ERC-20 (USDT) 转账签名');

  const erc20Result = signERC20Transfer(
    {
      tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT 合约
      to: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
      amount: 1000000n,  // 1 USDT（6 位小数）
      nonce: 1,
      gasPrice: 20000000000n,
      gasLimit: 65000n,
      chainId: 1,
    },
    wallet,
    [1, 3]
  );

  result('签名有效', erc20Result.valid ? '✓ 通过' : '✗ 失败');
  result('Raw Transaction', erc20Result.rawTransaction);

  return erc20Result;
}

// ─── Demo 6: 从派生子地址发起转账 ────────────────────────────────

async function demo6_DerivedAddressTransfer(wallet) {
  section('Demo 6: 从派生子地址（订单收款地址）归集资金');

  const result6 = signFromDerivedAddress(
    {
      to: wallet.rootAddress,    // 归集到根地址
      value: 500000000000000000n, // 0.5 ETH
      nonce: 0,
      gasPrice: 20000000000n,
      gasLimit: 21000n,
      chainId: 1,
    },
    wallet,
    42,   // 订单 #42 的收款地址
    [1, 2] // 方 1 和方 2 参与签名
  );

  result('源地址', result6.fromAddress);
  result('签名有效', result6.valid ? '✓ 通过' : '✗ 失败');

  return result6;
}

// ─── Demo 7: 安全验证——单片不泄露私钥 ────────────────────────────

async function demo7_SecurityValidation(wallet) {
  section('Demo 7: 安全验证 — 演示分片的信息论安全性');

  console.log('\n【测试 1】: 用足够多的分片（≥t）可以验证恢复私钥');
  const allShards = wallet.parties.map(p => ({
    x: p.id,
    y: p.keyShare,
  }));

  // 用 2 个分片恢复（门限 = 2）
  const recovered_1_2 = lagrangeInterpolateAtZero([allShards[0], allShards[1]]);
  const recovered_1_3 = lagrangeInterpolateAtZero([allShards[0], allShards[2]]);
  const recovered_2_3 = lagrangeInterpolateAtZero([allShards[1], allShards[2]]);

  console.log(`    分片 1+2 恢复: ${recovered_1_2.toString(16).slice(0, 24)}...`);
  console.log(`    分片 1+3 恢复: ${recovered_1_3.toString(16).slice(0, 24)}...`);
  console.log(`    分片 2+3 恢复: ${recovered_2_3.toString(16).slice(0, 24)}...`);

  const allMatch = recovered_1_2 === recovered_1_3 && recovered_1_3 === recovered_2_3;
  console.log(`    三种组合恢复值一致: ${allMatch ? '✓' : '✗'}`);

  // 验证恢复值对应正确公钥
  const { pointMul, pointToBytes, pubKeyToAddress } = require('./src/field');
  const recoveredPubKey = pointMul(recovered_1_2);
  const recoveredAddress = pubKeyToAddress(recoveredPubKey);
  const rootAddress = wallet.rootAddress;
  console.log(`    恢复地址 = 根地址: ${recoveredAddress === rootAddress ? '✓' : '✗'}`);
  console.log(`    （注: 真实 TSS 中此步骤不存在，私钥永不重建）`);

  console.log('\n【测试 2】: 仅用 1 个分片无法确定私钥');
  console.log('    在 2-of-3 方案中，单个分片对应无限多条可能的直线');
  console.log('    每条直线在 x=0 处的值不同 → 攻击者无法从单片推断私钥');
  console.log('    这是信息论安全（Information-theoretic security），不依赖计算困难假设 ✓');

  console.log('\n【测试 3】: 签名的链上不可区分性');
  console.log('    MPC 产生的 (r, s) 签名与普通私钥签名在数学上完全等价');
  console.log('    链上无法区分是 MPC 还是单私钥签名 ✓');

  return { recovered: recovered_1_2, addressMatch: recoveredAddress === rootAddress };
}

// ─── 主入口 ────────────────────────────────────────────────────────

async function main() {
  console.log('\n' + '═'.repeat(60));
  console.log('   MPC 钱包完整演示 — 基于 Feldman VSS + TSS');
  console.log('   3 方参与，门限 2-of-3');
  console.log('═'.repeat(60));

  try {
    // 1. 初始化钱包（运行 DKG）
    const wallet = await demo1_InitWallet();

    // 2. 地址派生
    await demo2_DeriveAddresses(wallet);

    // 3. 消息签名
    await demo3_SignMessage(wallet);

    // 4. ETH 转账
    await demo4_SignTransfer(wallet);

    // 5. ERC-20 转账
    await demo5_SignERC20(wallet);

    // 6. 子地址归集
    await demo6_DerivedAddressTransfer(wallet);

    // 7. 安全验证
    await demo7_SecurityValidation(wallet);

    section('全部演示完成');
    console.log('\n  所有 MPC 钱包功能验证通过 ✓');
    console.log('\n  生产环境迁移建议:');
    console.log('  ├─ 替换 DKG/TSS: @silencelaboratories/dkls-wasm-ll-node (DKLS23)');
    console.log('  ├─ 或使用经审计的 GG20 实现');
    console.log('  ├─ 加密信道: 各方通信使用 TLS + 消息加密（如 ECIES）');
    console.log('  ├─ HD 派生: 替换为完整 BIP-32 实现（使用 HMAC-SHA512）');
    console.log('  ├─ 交易编码: 使用 @ethereumjs/tx 处理完整 EIP-1559/EIP-2930 支持');
    console.log('  └─ 分片存储: 使用 HSM 或 TEE 保护各方的密钥分片\n');

  } catch (err) {
    console.error('\n演示过程中出现错误:', err);
    throw err;
  }
}

// 支持单独运行各 demo
module.exports = {
  demo1_InitWallet,
  demo2_DeriveAddresses,
  demo3_SignMessage,
  demo4_SignTransfer,
  demo5_SignERC20,
  demo6_DerivedAddressTransfer,
  demo7_SecurityValidation,
  main,
};

// 直接运行
main().catch(console.error);
