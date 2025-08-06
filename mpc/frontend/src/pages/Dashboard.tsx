import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Button, Space, Tag, Progress } from 'antd';
import { 
  WalletOutlined, 
  TransactionOutlined, 
  UserOutlined, 
  SafetyOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { Wallet, Transaction, User } from '../types';

interface DashboardProps {
  wallets: Wallet[];
  transactions: Transaction[];
  users: User[];
}

const Dashboard: React.FC<DashboardProps> = ({ wallets, transactions, users }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalWallets: 0,
    totalBalance: 0,
    pendingTransactions: 0,
    activeUsers: 0
  });

  useEffect(() => {
    calculateStats();
  }, [wallets, transactions, users]);

  const calculateStats = () => {
    const totalBalance = wallets.reduce((sum, wallet) => {
      return sum + wallet.balance.reduce((assetSum, asset) => assetSum + asset.usdValue, 0);
    }, 0);

    const pendingTransactions = transactions.filter(tx => 
      tx.status === 'pending' || tx.status === 'approved'
    ).length;

    const activeUsers = users.filter(user => user.status === 'active').length;

    setStats({
      totalWallets: wallets.length,
      totalBalance,
      pendingTransactions,
      activeUsers
    });
  };

  const recentTransactionsColumns = [
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      render: (hash: string) => hash.substring(0, 8) + '...' + hash.substring(hash.length - 8)
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'send' ? 'red' : 'green'}>
          {type === 'send' ? '发送' : '接收'}
        </Tag>
      )
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: string, record: Transaction) => (
        <span>
          {amount} {record.symbol}
        </span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusColors = {
          pending: 'orange',
          approved: 'blue',
          signed: 'cyan',
          broadcasted: 'purple',
          confirmed: 'green',
          failed: 'red',
          rejected: 'red'
        };
        return <Tag color={statusColors[status as keyof typeof statusColors]}>{status}</Tag>;
      }
    },
    {
      title: '时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => new Date(date).toLocaleString()
    }
  ];

  const walletColumns = [
    {
      title: '钱包名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => address.substring(0, 12) + '...' + address.substring(address.length - 8)
    },
    {
      title: '链',
      dataIndex: 'chain',
      key: 'chain',
      render: (chain: string) => <Tag color="blue">{chain.toUpperCase()}</Tag>
    },
    {
      title: '余额',
      dataIndex: 'balance',
      key: 'balance',
      render: (balance: any[]) => {
        const totalUSD = balance.reduce((sum, asset) => sum + asset.usdValue, 0);
        return `$${totalUSD.toFixed(2)}`;
      }
    },
    {
      title: '签名配置',
      dataIndex: 'threshold',
      key: 'threshold',
      render: (threshold: number, record: Wallet) => (
        <span>{threshold}/{record.totalShares}</span>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusColors = {
          active: 'green',
          inactive: 'gray',
          pending: 'orange',
          error: 'red'
        };
        return <Tag color={statusColors[status as keyof typeof statusColors]}>{status}</Tag>;
      }
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1>MPC钱包仪表板</h1>
      
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总钱包数"
              value={stats.totalWallets}
              prefix={<WalletOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总资产价值"
              value={stats.totalBalance}
              prefix="$"
              precision={2}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理交易"
              value={stats.pendingTransactions}
              prefix={<TransactionOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={stats.activeUsers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 钱包列表 */}
      <Card title="钱包概览" style={{ marginBottom: '24px' }}>
        <Table
          columns={walletColumns}
          dataSource={wallets}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 最近交易 */}
      <Card title="最近交易" style={{ marginBottom: '24px' }}>
        <Table
          columns={recentTransactionsColumns}
          dataSource={transactions.slice(0, 10)}
          rowKey="id"
          pagination={false}
          size="small"
        />
      </Card>

      {/* 安全状态 */}
      <Row gutter={16}>
        <Col span={12}>
          <Card title="MPC份额状态">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <span>活跃份额: </span>
                <Progress 
                  percent={85} 
                  status="active" 
                  strokeColor="#52c41a"
                  size="small"
                />
              </div>
              <div>
                <span>备份份额: </span>
                <Progress 
                  percent={15} 
                  status="normal" 
                  strokeColor="#1890ff"
                  size="small"
                />
              </div>
            </Space>
          </Card>
        </Col>
        <Col span={12}>
          <Card title="系统状态">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <SafetyOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <span>MPC协议: 正常</span>
              </div>
              <div>
                <SafetyOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <span>加密通信: 正常</span>
              </div>
              <div>
                <SafetyOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                <span>审计日志: 正常</span>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard; 