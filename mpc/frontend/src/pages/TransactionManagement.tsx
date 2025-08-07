import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Table, 
  Modal, 
  Form, 
  Input, 
  Select, 
  Space, 
  Tag, 
  message,
  Drawer,
  Descriptions,
  Steps,
  List,
  Avatar,
  InputNumber,
  Alert
} from 'antd';
import { 
  PlusOutlined, 
  EyeOutlined, 
  CheckOutlined,
  CloseOutlined,
  UserOutlined,
  SafetyOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Transaction, Wallet, User, TransactionStatus, TransactionType } from '../types';

const { Option } = Select;
const { Step } = Steps;

interface TransactionManagementProps {
  transactions: Transaction[];
  wallets: Wallet[];
  users: User[];
  onCreateTransaction: (data: any) => Promise<void>;
  onApproveTransaction: (transactionId: string, approved: boolean, comment?: string) => Promise<void>;
  onSignTransaction: (transactionId: string) => Promise<void>;
}

const TransactionManagement: React.FC<TransactionManagementProps> = ({
  transactions,
  wallets,
  users,
  onCreateTransaction,
  onApproveTransaction,
  onSignTransaction
}) => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [approvalModalVisible, setApprovalModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [approvalForm] = Form.useForm();

  const handleCreateTransaction = async (values: any) => {
    try {
      setLoading(true);
      await onCreateTransaction(values);
      message.success('交易创建成功，等待审批');
      setCreateModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('创建失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDetailDrawerVisible(true);
  };

  const handleApprove = async (values: any) => {
    if (!selectedTransaction) return;
    
    try {
      setLoading(true);
      await onApproveTransaction(
        selectedTransaction.id, 
        values.approved, 
        values.comment
      );
      message.success(values.approved ? '审批通过' : '审批拒绝');
      setApprovalModalVisible(false);
      approvalForm.resetFields();
    } catch (error) {
      message.error('操作失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (transactionId: string) => {
    try {
      setLoading(true);
      await onSignTransaction(transactionId);
      message.success('签名成功');
    } catch (error) {
      message.error('签名失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status: TransactionStatus) => {
    const statusSteps: Record<TransactionStatus, number> = {
      [TransactionStatus.PENDING]: 0,
      [TransactionStatus.APPROVED]: 1,
      [TransactionStatus.SIGNED]: 2,
      [TransactionStatus.BROADCASTED]: 3,
      [TransactionStatus.CONFIRMED]: 4,
      [TransactionStatus.FAILED]: -1,
      [TransactionStatus.REJECTED]: -1
    };
    return statusSteps[status] || 0;
  };

  const transactionColumns = [
    {
      title: '交易哈希',
      dataIndex: 'txHash',
      key: 'txHash',
      render: (hash: string) => (
        <span style={{ fontFamily: 'monospace' }}>
          {hash ? `${hash.substring(0, 8)}...${hash.substring(hash.length - 8)}` : '待生成'}
        </span>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: TransactionType) => (
        <Tag color={type === 'send' ? 'red' : 'green'}>
          {type === 'send' ? '发送' : '接收'}
        </Tag>
      )
    },
    {
      title: '发送方',
      dataIndex: 'from',
      key: 'from',
      render: (from: string) => (
        <span style={{ fontFamily: 'monospace' }}>
          {from.substring(0, 12)}...{from.substring(from.length - 8)}
        </span>
      )
    },
    {
      title: '接收方',
      dataIndex: 'to',
      key: 'to',
      render: (to: string) => (
        <span style={{ fontFamily: 'monospace' }}>
          {to.substring(0, 12)}...{to.substring(to.length - 8)}
        </span>
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
      render: (status: TransactionStatus) => {
        const statusConfig = {
          pending: { color: 'orange', text: '待审批' },
          approved: { color: 'blue', text: '已审批' },
          signed: { color: 'cyan', text: '已签名' },
          broadcasted: { color: 'purple', text: '已广播' },
          confirmed: { color: 'green', text: '已确认' },
          failed: { color: 'red', text: '失败' },
          rejected: { color: 'red', text: '已拒绝' }
        };
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: Date) => new Date(date).toLocaleString()
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Transaction) => (
        <Space>
          <Button 
            type="link" 
            icon={<EyeOutlined />}
            onClick={() => handleViewTransaction(record)}
          >
            查看
          </Button>
          {record.status === 'pending' && (
            <Button 
              type="link" 
              icon={<CheckOutlined />}
              onClick={() => {
                setSelectedTransaction(record);
                setApprovalModalVisible(true);
              }}
            >
              审批
            </Button>
          )}
          {record.status === 'approved' && (
            <Button 
              type="link" 
              icon={<SafetyOutlined />}
              onClick={() => handleSign(record.id)}
            >
              签名
            </Button>
          )}
        </Space>
      )
    }
  ];

  const renderTransactionDetail = () => {
    if (!selectedTransaction) return null;

    const currentStep = getStatusStep(selectedTransaction.status);

    return (
      <Drawer
        title="交易详情"
        width={700}
        visible={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        <Card title="交易状态" style={{ marginBottom: '16px' }}>
          <Steps current={currentStep}>
            <Step title="创建" description="交易已创建" />
            <Step title="审批" description="等待审批" />
            <Step title="签名" description="MPC签名" />
            <Step title="广播" description="广播到网络" />
            <Step title="确认" description="交易确认" />
          </Steps>
        </Card>

        <Card title="交易信息" style={{ marginBottom: '16px' }}>
          <Descriptions column={1} bordered>
            <Descriptions.Item label="交易哈希">
              {selectedTransaction.txHash || '待生成'}
            </Descriptions.Item>
            <Descriptions.Item label="交易类型">
              <Tag color={selectedTransaction.type === 'send' ? 'red' : 'green'}>
                {selectedTransaction.type === 'send' ? '发送' : '接收'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="发送方">
              <span style={{ fontFamily: 'monospace' }}>
                {selectedTransaction.from}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="接收方">
              <span style={{ fontFamily: 'monospace' }}>
                {selectedTransaction.to}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="金额">
              {selectedTransaction.amount} {selectedTransaction.symbol}
            </Descriptions.Item>
            <Descriptions.Item label="创建时间">
              {new Date(selectedTransaction.createdAt).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="审批记录" style={{ marginBottom: '16px' }}>
          <List
            dataSource={selectedTransaction.approvals}
            renderItem={(approval) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<UserOutlined />} />}
                  title={approval.username}
                  description={new Date(approval.timestamp).toLocaleString()}
                />
                <Tag color={approval.approved ? 'green' : 'red'}>
                  {approval.approved ? '通过' : '拒绝'}
                </Tag>
                {approval.comment && (
                  <div style={{ marginTop: '8px', color: '#666' }}>
                    备注: {approval.comment}
                  </div>
                )}
              </List.Item>
            )}
          />
        </Card>

        <Card title="签名记录">
          <List
            dataSource={selectedTransaction.signatures}
            renderItem={(signature) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<Avatar icon={<SafetyOutlined />} />}
                  title={signature.username}
                  description={new Date(signature.timestamp).toLocaleString()}
                />
                <Tag color="green">已签名</Tag>
              </List.Item>
            )}
          />
        </Card>
      </Drawer>
    );
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>交易管理</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建交易
        </Button>
      </div>

      <Card>
        <Table
          columns={transactionColumns}
          dataSource={transactions}
          rowKey="id"
          pagination={{
            total: transactions.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 创建交易模态框 */}
      <Modal
        title="创建新交易"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTransaction}
        >
          <Form.Item
            name="walletId"
            label="选择钱包"
            rules={[{ required: true, message: '请选择钱包' }]}
          >
            <Select placeholder="请选择发送钱包">
              {wallets.map(wallet => (
                <Option key={wallet.id} value={wallet.id}>
                  {wallet.name} ({wallet.address.substring(0, 12)}...)
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="to"
            label="接收地址"
            rules={[
              { required: true, message: '请输入接收地址' },
              { pattern: /^0x[a-fA-F0-9]{40}$/, message: '请输入有效的以太坊地址' }
            ]}
          >
            <Input placeholder="请输入接收地址" />
          </Form.Item>

          <Form.Item
            name="amount"
            label="发送金额"
            rules={[{ required: true, message: '请输入发送金额' }]}
          >
            <InputNumber 
              min={0} 
              step={0.000001}
              placeholder="请输入发送金额"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="symbol"
            label="代币类型"
            rules={[{ required: true, message: '请选择代币类型' }]}
          >
            <Select placeholder="请选择代币类型">
              <Option value="ETH">ETH</Option>
              <Option value="USDT">USDT</Option>
              <Option value="USDC">USDC</Option>
              <Option value="BTC">BTC</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="gasLimit"
            label="Gas限制"
          >
            <InputNumber 
              min={21000}
              placeholder="Gas限制（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="gasPrice"
            label="Gas价格"
          >
            <InputNumber 
              min={0}
              placeholder="Gas价格（可选）"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Alert
            message="安全提醒"
            description="交易创建后需要经过审批流程，确保资金安全。"
            type="info"
            showIcon
            style={{ marginBottom: '16px' }}
          />

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建交易
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 审批模态框 */}
      <Modal
        title="交易审批"
        visible={approvalModalVisible}
        onCancel={() => setApprovalModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={approvalForm}
          layout="vertical"
          onFinish={handleApprove}
        >
          <Form.Item
            name="approved"
            label="审批决定"
            rules={[{ required: true, message: '请选择审批决定' }]}
          >
            <Select placeholder="请选择审批决定">
              <Option value={true}>通过</Option>
              <Option value={false}>拒绝</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="comment"
            label="审批意见"
          >
            <Input.TextArea 
              rows={4}
              placeholder="请输入审批意见（可选）"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                确认
              </Button>
              <Button onClick={() => setApprovalModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {renderTransactionDetail()}
    </div>
  );
};

export default TransactionManagement; 