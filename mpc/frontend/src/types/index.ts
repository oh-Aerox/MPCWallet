// 用户相关类型
export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  organization: string;
  status: UserStatus;
  createdAt: Date;
  lastLoginAt: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  OPERATOR = 'operator',
  APPROVER = 'approver',
  VIEWER = 'viewer'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// 钱包相关类型
export interface Wallet {
  id: string;
  name: string;
  address: string;
  chain: Blockchain;
  threshold: number;
  totalShares: number;
  status: WalletStatus;
  balance: AssetBalance[];
  createdAt: Date;
  updatedAt: Date;
}

export enum Blockchain {
  BTC = 'bitcoin',
  ETH = 'ethereum',
  BSC = 'bsc',
  POLYGON = 'polygon'
}

export enum WalletStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  ERROR = 'error'
}

export interface AssetBalance {
  symbol: string;
  balance: string;
  decimals: number;
  usdValue: number;
}

// 交易相关类型
export interface Transaction {
  id: string;
  walletId: string;
  txHash: string;
  from: string;
  to: string;
  amount: string;
  symbol: string;
  status: TransactionStatus;
  type: TransactionType;
  signatures: Signature[];
  approvals: Approval[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TransactionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SIGNED = 'signed',
  BROADCASTED = 'broadcasted',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
  REJECTED = 'rejected'
}

export enum TransactionType {
  SEND = 'send',
  RECEIVE = 'receive',
  INTERNAL = 'internal'
}

export interface Signature {
  id: string;
  userId: string;
  username: string;
  signature: string;
  timestamp: Date;
}

export interface Approval {
  id: string;
  userId: string;
  username: string;
  approved: boolean;
  comment?: string;
  timestamp: Date;
}

// MPC相关类型
export interface MPCShare {
  id: string;
  walletId: string;
  userId: string;
  shareIndex: number;
  encryptedShare: string;
  publicKey: string;
  status: ShareStatus;
  createdAt: Date;
}

export enum ShareStatus {
  ACTIVE = 'active',
  BACKUP = 'backup',
  RECOVERED = 'recovered',
  LOST = 'lost'
}

export interface MPCConfig {
  threshold: number;
  totalShares: number;
  algorithm: MPCAlgorithm;
  keyType: KeyType;
}

export enum MPCAlgorithm {
  SHAMIR = 'shamir',
  BLS = 'bls',
  ECDSA = 'ecdsa'
}

export enum KeyType {
  SECP256K1 = 'secp256k1',
  ED25519 = 'ed25519'
}

// 审计日志类型
export interface AuditLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 表单类型
export interface CreateWalletForm {
  name: string;
  chain: Blockchain;
  threshold: number;
  totalShares: number;
  participants: string[];
}

export interface CreateTransactionForm {
  walletId: string;
  to: string;
  amount: string;
  symbol: string;
  gasLimit?: string;
  gasPrice?: string;
}

export interface ApproveTransactionForm {
  transactionId: string;
  approved: boolean;
  comment?: string;
}

// 实时通信类型
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
}

export interface TransactionUpdate {
  transactionId: string;
  status: TransactionStatus;
  signatures: Signature[];
  approvals: Approval[];
} 