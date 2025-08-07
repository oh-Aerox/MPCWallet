import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  InputNumber, 
  Space, 
  Tag, 
  message,
  Drawer,
  Descriptions,
  Tabs,
  List,
  Avatar
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  SettingOutlined,
  UserOutlined,
  SafetyOutlined,
  TransactionOutlined
} from '@ant-design/icons';
import { Wallet, MPCShare, Transaction, Blockchain, User } from '../types';

const { Option } = Select;
const { TabPane } = Tabs;

interface WalletManagementProps {
  wallets: Wallet[];
  users: User[];
  onCreateWallet: (data: any) => Promise<void>;
  onViewWallet: (walletId: string) => void;
}

const WalletManagement: React.FC<WalletManagementProps> = ({
  wallets,
  users,
  onCreateWallet,
  onViewWallet
}) => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const handleCreateWallet = async (values: any) => {
    try {
      setLoading(true);
      await onCreateWallet(values);
      message.success('钱包创建成功');
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('创建失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewWallet = (wallet: Wallet) => {
    setSelectedWallet(wallet);
    setDetailDrawerVisible(true);
  };

  const walletColumns = [
    {
      title: '钱包名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Wallet) => (
        <Button type="link" onClick={() => handleViewWallet(record)}>
          {text}
        </Button>
      )
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      render: (address: string) => (
        <span style={{ fontFamily: 'monospace' }}>
          {address.substring(0, 12)}...{address.substring(address.length - 8)}
        </span>
      )
    },
    {
      title: '区块链',
      dataIndex: 'chain',
      key: 'chain',
      render: (chain: Blockchain) => (
        <Tag color="blue">{chain.toUpperCase()}</Tag>
      )
    },
    {
      title: '总资产',
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
        const statusConfig = {
          active: { color: 'green', text: '活跃' },
          inactive: { color: 'gray', text: '非活跃' },
          pending: { color: 'orange', text: '处理中' },
          error: { color: 'red', text: '错误' }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => new Date(date).toLocaleDateString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Wallet) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleViewWallet(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            icon={<SettingOutlined />}
          >
            设置
          </Button>
        </Space>
      )
    }
  ];

  const renderWalletDetail = () => {
    if (!selectedWallet) return null;

    return (
      <Drawer
        title="钱包详情"
        width={600}
        visible={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        <Tabs defaultActiveKey="overview">
          <TabPane tab="概览" key="overview">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="钱包名称">
                {selectedWallet.name}
              </Descriptions.Item>
              <Descriptions.Item label="钱包地址">
                <span style={{ fontFamily: 'monospace' }}>
                  {selectedWallet.address}
                </span>
              </Descriptions.Item>
              <Descriptions.Item label="区块链">
                <Tag color="blue">{selectedWallet.chain.toUpperCase()}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="签名配置">
                {selectedWallet.threshold}/{selectedWallet.totalShares}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color="green">{selectedWallet.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {new Date(selectedWallet.createdAt).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Card title="资产余额" style={{ marginTop: '16px' }}>
              <List
                dataSource={selectedWallet.balance}
                renderItem={(asset) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${asset.symbol}`}
                      description={`$${asset.usdValue.toFixed(2)}`}
                    />
                    <div>{asset.balance}</div>
                  </List.Item>
                )}
              />
            </Card>
          </TabPane>

          <TabPane tab="MPC份额" key="shares">
            <Card title="份额分布">
              <List
                dataSource={Array.from({ length: selectedWallet.totalShares }, (_, i) => ({
                  id: i + 1,
                  status: i < selectedWallet.threshold ? 'active' : 'backup',
                  holder: `用户 ${i + 1}`
                }))}
                renderItem={(share) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={`份额 ${share.id}`}
                      description={share.holder}
                    />
                    <Tag color={share.status === 'active' ? 'green' : 'blue'}>
                      {share.status === 'active' ? '活跃' : '备份'}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </TabPane>

          <TabPane tab="安全设置" key="security">
            <Card title="安全配置">
              <Descriptions column={1} bordered>
                <Descriptions.Item label="MPC算法">
                  Shamir秘密共享
                </Descriptions.Item>
                <Descriptions.Item label="密钥类型">
                  SECP256K1
                </Descriptions.Item>
                <Descriptions.Item label="加密标准">
                  AES-256-GCM
                </Descriptions.Item>
                <Descriptions.Item label="通信加密">
                  TLS 1.3
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </TabPane>
        </Tabs>
      </Drawer>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>钱包管理</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建钱包
        </Button>
      </div>

      <Card>
        <Table
          columns={walletColumns}
          dataSource={wallets}
          rowKey="id"
          pagination={{
            total: wallets.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 创建钱包模态框 */}
      <Modal
        title="创建新钱包"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateWallet}
        >
          <Form.Item
            name="name"
            label="钱包名称"
            rules={[{ required: true, message: '请输入钱包名称' }]}
          >
            <Input placeholder="请输入钱包名称" />
          </Form.Item>

          <Form.Item
            name="chain"
            label="区块链"
            rules={[{ required: true, message: '请选择区块链' }]}
          >
            <Select placeholder="请选择区块链">
              <Option value={Blockchain.BTC}>Bitcoin (BTC)</Option>
              <Option value={Blockchain.ETH}>Ethereum (ETH)</Option>
              <Option value={Blockchain.BSC}>Binance Smart Chain (BSC)</Option>
              <Option value={Blockchain.POLYGON}>Polygon (MATIC)</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="threshold"
            label="签名阈值"
            rules={[{ required: true, message: '请输入签名阈值' }]}
          >
            <InputNumber 
              min={1} 
              max={10} 
              placeholder="需要多少个签名才能完成交易"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="totalShares"
            label="总份额数"
            rules={[{ required: true, message: '请输入总份额数' }]}
          >
            <InputNumber 
              min={2} 
              max={20} 
              placeholder="总共生成多少个份额"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="participants"
            label="参与用户"
            rules={[{ required: true, message: '请选择参与用户' }]}
          >
            <Select
              mode="multiple"
              placeholder="选择参与MPC的用户"
              style={{ width: '100%' }}
            >
              {users.map(user => (
                <Option key={user.id} value={user.id}>
                  {user.username} ({user.email})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建钱包
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {renderWalletDetail()}
    </div>
  );
};

export default WalletManagement; 