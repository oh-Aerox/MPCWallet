'use strict';

/**
 * wallet.js — MPC 钱包编排器
 *
 * 将 DKG、TSS、HD 派生、交易构造整合为一个完整的 MPC 钱包 API。
 * 每个函数可单独调用测试。
 */

const { runDKG } = require('./dkg');
const { runTSS, verifySignature } = require('./tss');
const {
  deriveRootChainCode,
  deriveChildPublicKey,
  derivePathPublicKey,
  applyTweaksToKeyShare,
  deriveReceivingAddresses,
} = require('./hdwallet');
const {
  buildTransferTransaction,
  buildERC20TransferTransaction,
  hashTransaction,
  serializeSignedTransaction,
  formatTransaction,
} = require('./transaction');
const { hashMessage, bigIntToHex, pubKeyToAddress, pointFromBytes } = require('./field');

// ─── 1. 钱包初始化（DKG）────────────────────────────────────────

/**
 * 初始化 MPC 钱包：运行 DKG 协议，三方生成密钥分片
 *
 * @param {{ n?: number, t?: number }} options
 * @returns {{ parties, groupPublicKey, rootAddress, chainCode }}
 */
function initMPCWallet(options = {}) {
  const n = options.n ?? 3;
  const t = options.t ?? 2;

  const { parties, groupPublicKey, address } = runDKG(n, t);

  // 生成根链码（用于 HD 派生）
  const chainCode = deriveRootChainCode(groupPublicKey);

  console.log('MPC 钱包初始化完成:');
  console.log(`  根地址: ${address}`);
  console.log(`  链码: ${chainCode.toString('hex').slice(0, 16)}...`);

  return {
    parties,
    groupPublicKey,
    rootAddress: address,
    chainCode,
    config: { n, t },
  };
}

// ─── 2. 地址派生 ────────────────────────────────────────────────

/**
 * 派生单个收款地址（按订单 ID）
 *
 * @param {Buffer} groupPublicKey
 * @param {Buffer} chainCode
 * @param {number} orderId - 订单号（即子地址索引）
 * @returns {{ address, pubKey, path, tweaks }}
 */
function deriveOrderAddress(groupPublicKey, chainCode, orderId) {
  const result = derivePathPublicKey(groupPublicKey, chainCode, [0, orderId]);
  console.log(`订单 #${orderId} 收款地址: ${result.address} (路径: m/0/${orderId})`);
  return result;
}

/**
 * 批量派生收款地址
 *
 * @param {Buffer} groupPublicKey
 * @param {Buffer} chainCode
 * @param {number} count
 * @returns {Array}
 */
function deriveAddressBatch(groupPublicKey, chainCode, count) {
  console.log(`\n批量派生 ${count} 个收款地址...`);
  const addresses = deriveReceivingAddresses(groupPublicKey, chainCode, count);
  addresses.forEach(a => {
    console.log(`  [${a.path}] ${a.address}`);
  });
  return addresses;
}

// ─── 3. 消息签名 ─────────────────────────────────────────────────

/**
 * 对任意消息进行 MPC 签名（personal_sign 格式）
 *
 * @param {string} message - 要签名的消息
 * @param {Object} wallet  - initMPCWallet 返回的钱包对象
 * @param {number[]} signerIds - 参与签名的方编号（需 >= t 个）
 * @returns {{ message, messageHash, signature, signers }}
 */
function signMessage(message, wallet, signerIds) {
  console.log(`\n签名消息: "${message}"`);
  console.log(`参与方: [${signerIds.join(', ')}]`);

  const messageHash = hashMessage(message);

  const { r, s, rHex, sHex, valid } = runTSS(
    messageHash,
    wallet.parties,
    signerIds,
    wallet.groupPublicKey
  );

  return {
    message,
    messageHash: bigIntToHex(messageHash),
    signature: {
      r: rHex,
      s: sHex,
    },
    signers: signerIds,
    valid,
  };
}

// ─── 4. ETH 转账签名 ─────────────────────────────────────────────

/**
 * 构造并多方签名 ETH 转账交易
 *
 * @param {Object} params - 交易参数 { to, value, nonce, gasPrice, gasLimit, chainId }
 * @param {Object} wallet - MPC 钱包对象
 * @param {number[]} signerIds - 参与签名的方编号
 * @returns {{ tx, txHash, signature, rawTransaction }}
 */
function signTransfer(params, wallet, signerIds) {
  const tx = buildTransferTransaction({
    from: wallet.rootAddress,
    ...params,
  });

  console.log('\n构造 ETH 转账交易:');
  console.log(JSON.stringify(formatTransaction(tx), null, 2));

  const { hash: txHash } = hashTransaction(tx, tx.chainId);

  console.log(`交易哈希: ${bigIntToHex(txHash)}`);

  const { r, s, valid } = runTSS(
    txHash,
    wallet.parties,
    signerIds,
    wallet.groupPublicKey
  );

  // EIP-155: v = chainId * 2 + 35/36（recoveryBit 需要额外计算，此处简化为 0）
  const rawTransaction = serializeSignedTransaction(tx, { r, s }, tx.chainId, 0n);

  console.log('\n签名交易（Raw Transaction 前 80 字符）:');
  console.log(rawTransaction.slice(0, 80) + '...');

  return {
    tx,
    txHash: bigIntToHex(txHash),
    signature: { r: bigIntToHex(r), s: bigIntToHex(s) },
    rawTransaction,
    valid,
  };
}

/**
 * 构造并签名 ERC-20 转账交易
 */
function signERC20Transfer(params, wallet, signerIds) {
  const tx = buildERC20TransferTransaction({
    from: wallet.rootAddress,
    ...params,
  });

  console.log('\n构造 ERC-20 转账交易:');
  console.log(JSON.stringify(formatTransaction(tx), null, 2));

  const { hash: txHash } = hashTransaction(tx, tx.chainId);

  const { r, s, valid } = runTSS(
    txHash,
    wallet.parties,
    signerIds,
    wallet.groupPublicKey
  );

  const rawTransaction = serializeSignedTransaction(tx, { r, s }, tx.chainId, 0n);

  return {
    tx,
    txHash: bigIntToHex(txHash),
    signature: { r: bigIntToHex(r), s: bigIntToHex(s) },
    rawTransaction,
    valid,
  };
}

// ─── 5. 子地址签名（HD + TSS 组合）──────────────────────────────

/**
 * 对子地址（派生地址）上的资金发起转账签名
 * 各方需先对自己的密钥分片应用相同的 tweak 得到子分片，再参与 TSS
 *
 * @param {Object} params - 交易参数
 * @param {Object} wallet - 钱包对象
 * @param {number} orderId - 子地址的订单号（用于还原 tweak）
 * @param {number[]} signerIds
 */
function signFromDerivedAddress(params, wallet, orderId, signerIds) {
  console.log(`\n从派生地址 m/0/${orderId} 发起转账...`);

  // 重新推导 tweaks
  const { address, tweaks } = deriveOrderAddress(
    wallet.groupPublicKey,
    wallet.chainCode,
    orderId
  );

  console.log(`  源地址: ${address}`);

  // 构建一个临时的"子钱包"：各方的分片加上 tweak
  const adjustedParties = wallet.parties.map(party => ({
    ...party,
    keyShare: applyTweaksToKeyShare(party.keyShare, tweaks),
  }));

  // 子地址对应的公钥
  const { pubKey: childPubKey } = derivePathPublicKey(
    wallet.groupPublicKey,
    wallet.chainCode,
    [0, orderId]
  );

  const tx = buildTransferTransaction({
    from: address,
    ...params,
  });

  const { hash: txHash } = hashTransaction(tx, tx.chainId);

  // 用子分片参与 TSS 签名
  const { r, s, valid } = runTSS(
    txHash,
    adjustedParties,
    signerIds,
    childPubKey
  );

  const rawTransaction = serializeSignedTransaction(tx, { r, s }, tx.chainId, 0n);

  return {
    fromAddress: address,
    orderId,
    txHash: bigIntToHex(txHash),
    signature: { r: bigIntToHex(r), s: bigIntToHex(s) },
    rawTransaction,
    valid,
  };
}

module.exports = {
  initMPCWallet,
  deriveOrderAddress,
  deriveAddressBatch,
  signMessage,
  signTransfer,
  signERC20Transfer,
  signFromDerivedAddress,
};