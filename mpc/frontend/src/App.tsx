import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  WalletOutlined,
  TransactionOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import WalletManagement from './pages/WalletManagement';
import TransactionManagement from './pages/TransactionManagement';
import { User, Wallet, Transaction } from './types';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    // 模拟用户登录
    const mockUser: User = {
      id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      organization: 'MPC Wallet Corp',
      status: 'active',
      createdAt: new Date(),
      lastLoginAt: new Date()
    };
    setCurrentUser(mockUser);

    // 模拟数据
    const mockWallets: Wallet[] = [
      {
        id: '1',
        name: '主钱包',
        address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        chain: 'ethereum',
        threshold: 2,
        totalShares: 3,
        status: 'active',
        balance: [
          {
            symbol: 'ETH',
            balance: '1.23456789',
            decimals: 18,
            usdValue: 1234.56
          },
          {
            symbol: 'USDT',
            balance: '1000.00',
            decimals: 6,
            usdValue: 1000.00
          }
        ],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockTransactions: Transaction[] = [
      {
        id: '1',
        walletId: '1',
        txHash: '0x1234567890abcdef',
        from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        to: '0x9876543210fedcba',
        amount: '0.1',
        symbol: 'ETH',
        status: 'confirmed',
        type: 'send',
        signatures: [],
        approvals: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const mockUsers: User[] = [
      {
        id: '1',
        username: 'admin',
        email: 'admin@example.com',
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
        role: 'operator',
        organization: 'MPC Wallet Corp',
        status: 'active',
        createdAt: new Date(),
        lastLoginAt: new Date()
      }
    ];

    setWallets(mockWallets);
    setTransactions(mockTransactions);
    setUsers(mockUsers);
  }, []);

  const handleCreateWallet = async (data: any) => {
    // 模拟创建钱包
    const newWallet: Wallet = {
      id: Date.now().toString(),
      name: data.name,
      address: '0x' + Math.random().toString(16).substr(2, 40),
      chain: data.chain,
      threshold: data.threshold,
      totalShares: data.totalShares,
      status: 'active',
      balance: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setWallets([...wallets, newWallet]);
  };

  const handleCreateTransaction = async (data: any) => {
    // 模拟创建交易
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      walletId: data.walletId,
      txHash: null,
      from: wallets.find(w => w.id === data.walletId)?.address || '',
      to: data.to,
      amount: data.amount,
      symbol: data.symbol,
      status: 'pending',
      type: 'send',
      signatures: [],
      approvals: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setTransactions([...transactions, newTransaction]);
  };

  const handleApproveTransaction = async (transactionId: string, approved: boolean, comment?: string) => {
    // 模拟审批交易
    setTransactions(transactions.map(tx => {
      if (tx.id === transactionId) {
        return {
          ...tx,
          status: approved ? 'approved' : 'rejected',
          approvals: [...tx.approvals, {
            id: Date.now().toString(),
            userId: currentUser?.id || '',
            username: currentUser?.username || '',
            approved,
            comment,
            timestamp: new Date()
          }]
        };
      }
      return tx;
    }));
  };

  const handleSignTransaction = async (transactionId: string) => {
    // 模拟签名交易
    setTransactions(transactions.map(tx => {
      if (tx.id === transactionId) {
        return {
          ...tx,
          status: 'signed',
          signatures: [...tx.signatures, {
            id: Date.now().toString(),
            userId: currentUser?.id || '',
            username: currentUser?.username || '',
            signature: '0x' + Math.random().toString(16).substr(2, 128),
            timestamp: new Date()
          }]
        };
      }
      return tx;
    }));
  };

  const userMenu = (
    <Menu>
      <Menu.Item key="profile" icon={<UserOutlined />}>
        个人资料
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />}>
        设置
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" icon={<LogoutOutlined />}>
        退出登录
      </Menu.Item>
    </Menu>
  );

  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: '仪表板',
    },
    {
      key: '/wallets',
      icon: <WalletOutlined />,
      label: '钱包管理',
    },
    {
      key: '/transactions',
      icon: <TransactionOutlined />,
      label: '交易管理',
    },
    {
      key: '/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
  ];

  if (!currentUser) {
    return <div>Loading...</div>;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed}>
        <div style={{ height: 32, margin: 16, background: 'rgba(255, 255, 255, 0.2)' }} />
        <Menu
          theme="dark"
          defaultSelectedKeys={['/']}
          mode="inline"
          items={menuItems}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginLeft: 16 }}>
            MPC钱包系统
          </div>
          <Space style={{ marginRight: 16 }}>
            <BellOutlined style={{ fontSize: '18px' }} />
            <Dropdown overlay={userMenu} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{currentUser.username}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '16px' }}>
          <Routes>
            <Route path="/" element={
              <Dashboard 
                wallets={wallets}
                transactions={transactions}
                users={users}
              />
            } />
            <Route path="/wallets" element={
              <WalletManagement 
                wallets={wallets}
                users={users}
                onCreateWallet={handleCreateWallet}
                onViewWallet={() => {}}
              />
            } />
            <Route path="/transactions" element={
              <TransactionManagement 
                transactions={transactions}
                wallets={wallets}
                users={users}
                onCreateTransaction={handleCreateTransaction}
                onApproveTransaction={handleApproveTransaction}
                onSignTransaction={handleSignTransaction}
              />
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 