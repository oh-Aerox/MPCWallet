import React, { useState } from 'react';
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
  Popconfirm,
  Avatar,
  Tooltip
} from 'antd';
import { 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined,
  UserOutlined,
  MailOutlined
} from '@ant-design/icons';
import { User, UserRole, UserStatus } from '../types';

const { Option } = Select;

interface UserManagementProps {
  users: User[];
  onCreateUser: (data: any) => Promise<void>;
  onUpdateUser: (id: string, data: any) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
}

const UserManagement: React.FC<UserManagementProps> = ({
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser
}) => {
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const handleCreateUser = async (values: any) => {
    try {
      setLoading(true);
      await onCreateUser(values);
      message.success('用户创建成功');
      setCreateModalVisible(false);
      createForm.resetFields();
    } catch (error) {
      message.error('创建失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = async (values: any) => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      await onUpdateUser(selectedUser.id, values);
      message.success('用户更新成功');
      setEditModalVisible(false);
      setSelectedUser(null);
      editForm.resetFields();
    } catch (error) {
      message.error('更新失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await onDeleteUser(userId);
      message.success('用户删除成功');
    } catch (error) {
      message.error('删除失败: ' + error);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      organization: user.organization,
      role: user.role,
      status: user.status
    });
    setEditModalVisible(true);
  };

  const userColumns = [
    {
      title: '用户信息',
      key: 'userInfo',
      render: (_: any, record: User) => (
        <Space>
          <Avatar 
            icon={<UserOutlined />} 
            style={{ backgroundColor: '#1890ff' }}
          />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.username}</div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {record.email}
            </div>
          </div>
        </Space>
      )
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: UserRole) => {
        const roleConfig: Record<UserRole, { color: string; text: string }> = {
          [UserRole.ADMIN]: { color: 'red', text: '管理员' },
          [UserRole.USER]: { color: 'blue', text: '普通用户' },
          [UserRole.OPERATOR]: { color: 'green', text: '操作员' },
          [UserRole.APPROVER]: { color: 'orange', text: '审批员' },
          [UserRole.VIEWER]: { color: 'gray', text: '查看者' }
        };
        const config = roleConfig[role];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: UserStatus) => {
        const statusConfig = {
          [UserStatus.ACTIVE]: { color: 'green', text: '活跃' },
          [UserStatus.INACTIVE]: { color: 'gray', text: '非活跃' },
          [UserStatus.SUSPENDED]: { color: 'orange', text: '已暂停' }
        };
        const config = statusConfig[status];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '最后登录',
      dataIndex: 'lastLoginAt',
      key: 'lastLoginAt',
      render: (date: Date) => 
        date ? new Date(date).toLocaleString() : '从未登录'
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
      render: (_: any, record: User) => (
        <Space>
          <Tooltip title="编辑用户">
            <Button 
              type="link" 
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            >
              编辑
            </Button>
          </Tooltip>
          <Popconfirm
            title="确定要删除这个用户吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDeleteUser(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除用户">
              <Button 
                type="link" 
                danger 
                icon={<DeleteOutlined />}
              >
                删除
              </Button>
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
        <h1>用户管理</h1>
        <Button 
          type="primary" 
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          添加用户
        </Button>
      </div>

      <Card>
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="id"
          pagination={{
            total: users.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
        />
      </Card>

      {/* 创建用户模态框 */}
      <Modal
        title="添加新用户"
        visible={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateUser}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="请输入用户名" 
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="请输入邮箱" 
            />
          </Form.Item>

          <Form.Item
            name="organization"
            label="组织"
          >
            <Input placeholder="请输入组织名称" />
          </Form.Item>

          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6个字符' }
            ]}
          >
            <Input.Password placeholder="请输入密码" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择用户角色">
              <Option value={UserRole.ADMIN}>管理员</Option>
              <Option value={UserRole.USER}>普通用户</Option>
              <Option value={UserRole.OPERATOR}>操作员</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择用户状态">
              <Option value={UserStatus.ACTIVE}>活跃</Option>
              <Option value={UserStatus.INACTIVE}>非活跃</Option>
              <Option value={UserStatus.SUSPENDED}>已暂停</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                创建用户
              </Button>
              <Button onClick={() => setCreateModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 编辑用户模态框 */}
      <Modal
        title="编辑用户"
        visible={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleEditUser}
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, message: '用户名至少3个字符' }
            ]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="请输入用户名" 
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入有效的邮箱地址' }
            ]}
          >
            <Input 
              prefix={<MailOutlined />} 
              placeholder="请输入邮箱" 
            />
          </Form.Item>

          <Form.Item
            name="organization"
            label="组织"
          >
            <Input placeholder="请输入组织名称" />
          </Form.Item>

          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select placeholder="请选择用户角色">
              <Option value={UserRole.ADMIN}>管理员</Option>
              <Option value={UserRole.USER}>普通用户</Option>
              <Option value={UserRole.OPERATOR}>操作员</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择用户状态">
              <Option value={UserStatus.ACTIVE}>活跃</Option>
              <Option value={UserStatus.INACTIVE}>非活跃</Option>
              <Option value={UserStatus.SUSPENDED}>已暂停</Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                更新用户
              </Button>
              <Button onClick={() => setEditModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement; 