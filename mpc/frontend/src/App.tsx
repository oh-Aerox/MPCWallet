import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space } from 'antd';
import {
  DashboardOutlined,
  WalletOutlined,
  TransactionOutlined,
  TeamOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined
} from '@ant-design/icons';
import Dashboard from './pages/Dashboard';
import WalletManagement from './pages/WalletManagement';
import TransactionManagement from './pages/TransactionManagement';
import UserManagement from './pages/UserManagement';
import { User, Wallet, Transaction } from './types';

const { Header, Sider, Content } = Layout;

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // API 基础URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

  // 获取当前用户信息
  const fetchCurrentUser = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data/current-user`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCurrentUser(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  // 获取所有用户
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data/users`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setUsers(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // 获取所有钱包
  const fetchWallets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data/wallets`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setWallets(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  // 获取所有交易
  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/data/transactions`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTransactions(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  // 初始化数据
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      try {
        // 并行获取所有数据
        await Promise.all([
          fetchCurrentUser(),
          fetchUsers(),
          fetchWallets(),
          fetchTransactions()
        ]);
      } catch (error) {
        console.error('Error initializing data:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []);

  const handleCreateWallet = async (data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/wallets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        // 重新获取钱包数据
        await fetchWallets();
      }
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
  };

  const handleCreateTransaction = async (data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      if (response.ok) {
        // 重新获取交易数据
        await fetchTransactions();
      }
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleApproveTransaction = async (transactionId: string, approved: boolean, comment?: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approved, comment })
      });

      if (response.ok) {
        // 重新获取交易数据
        await fetchTransactions();
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
    }
  };

  const handleSignTransaction = async (transactionId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // 重新获取交易数据
        await fetchTransactions();
      }
    } catch (error) {
      console.error('Error signing transaction:', error);
    }
  };

  const handleViewWallet = (walletId: string) => {
    // 实现钱包详情查看逻辑
    console.log('View wallet:', walletId);
  };

  const handleViewTransaction = (transactionId: string) => {
    // 实现交易详情查看逻辑
    console.log('View transaction:', transactionId);
  };

  // 用户管理相关函数
  const handleCreateUser = async (data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('创建用户失败');
      }

      // 重新获取用户列表
      await fetchUsers();
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  };

  const handleUpdateUser = async (userId: string, data: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('更新用户失败');
      }

      // 重新获取用户列表
      await fetchUsers();
    } catch (error) {
      console.error('更新用户失败:', error);
      throw error;
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('删除用户失败');
      }

      // 重新获取用户列表
      await fetchUsers();
    } catch (error) {
      console.error('删除用户失败:', error);
      throw error;
    }
  };

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    console.log('Menu clicked:', key);
    navigate(`/${key}`);
  };

  // 根据当前路径获取选中的菜单项
  const getSelectedKey = () => {
    const path = location.pathname;
    console.log('Current path:', path);
    if (path === '/' || path === '/dashboard') return 'dashboard';
    if (path === '/wallets') return 'wallets';
    if (path === '/transactions') return 'transactions';
    if (path === '/users') return 'users';
    return 'dashboard';
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={setCollapsed}
        theme="dark"
      >
        <div style={{ 
          height: '32px', 
          margin: '16px', 
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          MPC Wallet
        </div>
        <Menu
          theme="dark"
          selectedKeys={[getSelectedKey()]}
          mode="inline"
          onClick={handleMenuClick}
          items={[
            {
              key: 'dashboard',
              icon: <DashboardOutlined />,
              label: '仪表板',
            },
            {
              key: 'wallets',
              icon: <WalletOutlined />,
              label: '钱包管理',
            },
            {
              key: 'transactions',
              icon: <TransactionOutlined />,
              label: '交易管理',
            },
            {
              key: 'users',
              icon: <TeamOutlined />,
              label: '用户管理',
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ 
          padding: '0 16px', 
          background: '#fff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between' 
        }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
            MPC 钱包管理系统
          </div>
          <Space>
            <BellOutlined style={{ fontSize: '16px' }} />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    icon: <UserOutlined />,
                    label: '个人资料',
                  },
                  {
                    key: 'settings',
                    icon: <SettingOutlined />,
                    label: '设置',
                  },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: '退出登录',
                  },
                ],
              }}
            >
              <Avatar 
                style={{ 
                  backgroundColor: '#1890ff', 
                  cursor: 'pointer' 
                }}
              >
                {currentUser?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '16px' }}>
          {/* 测试按钮 */}
          <div style={{ marginBottom: '16px' }}>
            <button onClick={() => navigate('/dashboard')}>测试仪表板</button>
            <button onClick={() => navigate('/wallets')} style={{ marginLeft: '8px' }}>测试钱包</button>
            <button onClick={() => navigate('/transactions')} style={{ marginLeft: '8px' }}>测试交易</button>
          </div>
          <Routes>
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" replace />} 
            />
            <Route 
              path="/dashboard" 
              element={
                <div>
                  <h2>仪表板页面</h2>
                  <Dashboard 
                    wallets={wallets}
                    transactions={transactions}
                    users={users}
                  />
                </div>
              } 
            />
            <Route 
              path="/wallets" 
              element={
                <div>
                  <h2>钱包管理页面</h2>
                  <WalletManagement 
                    wallets={wallets}
                    users={users}
                    onCreateWallet={handleCreateWallet}
                    onViewWallet={handleViewWallet}
                  />
                </div>
              } 
            />
            <Route 
              path="/transactions" 
              element={
                <div>
                  <h2>交易管理页面</h2>
                  <TransactionManagement 
                    transactions={transactions}
                    wallets={wallets}
                    users={users}
                    onCreateTransaction={handleCreateTransaction}
                    onApproveTransaction={handleApproveTransaction}
                    onSignTransaction={handleSignTransaction}
                  />
                </div>
              } 
            />
            <Route 
              path="/users" 
              element={
                <div>
                  <h2>用户管理页面</h2>
                  <UserManagement 
                    users={users}
                    onCreateUser={handleCreateUser}
                    onUpdateUser={handleUpdateUser}
                    onDeleteUser={handleDeleteUser}
                  />
                </div>
              } 
            />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App; 