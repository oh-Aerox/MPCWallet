# 用户管理功能实现说明

## 问题描述

用户反馈在创建钱包时需要选择参与用户，但是页面中没有地方显示用户列表，无法对用户进行增删改查操作。

## 解决方案

### 1. 前端实现

#### 1.1 创建用户管理页面 (`frontend/src/pages/UserManagement.tsx`)

**功能特性：**
- ✅ 用户列表展示（表格形式）
- ✅ 添加新用户（模态框）
- ✅ 编辑用户信息（模态框）
- ✅ 删除用户（确认对话框）
- ✅ 用户状态管理（活跃/非活跃/已暂停）
- ✅ 用户角色管理（管理员/普通用户/操作员/审批员/查看者）

**界面组件：**
- 用户信息展示（头像、用户名、邮箱）
- 角色标签（不同颜色区分）
- 状态标签（不同颜色区分）
- 操作按钮（编辑、删除）
- 分页功能

#### 1.2 更新类型定义 (`frontend/src/types/index.ts`)

**修改内容：**
- 添加 `phone?: string` 字段到 User 接口
- 添加 `USER = 'user'` 到 UserRole 枚举
- 将 `organization` 和 `lastLoginAt` 设为可选字段

#### 1.3 更新主应用 (`frontend/src/App.tsx`)

**新增功能：**
- 添加用户管理菜单项（TeamOutlined 图标）
- 实现用户管理相关 API 调用函数：
  - `handleCreateUser` - 创建用户
  - `handleUpdateUser` - 更新用户
  - `handleDeleteUser` - 删除用户
- 添加用户管理路由 `/users`

### 2. 后端实现

#### 2.1 创建用户管理路由 (`backend/src/routes/users.js`)

**API 端点：**

| 方法 | 路径 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/users` | 获取所有用户 | ✅ |
| GET | `/api/users/:id` | 获取单个用户 | ✅ |
| POST | `/api/users` | 创建用户 | ✅ |
| PUT | `/api/users/:id` | 更新用户 | ✅ |
| DELETE | `/api/users/:id` | 删除用户 | ✅ |
| PUT | `/api/users/:id/password` | 更新密码 | ✅ |

**功能特性：**
- ✅ 用户数据验证
- ✅ 密码加密存储
- ✅ 用户名/邮箱唯一性检查
- ✅ 删除前检查关联关系
- ✅ 错误处理和响应

#### 2.2 注册路由 (`backend/src/index.js`)

添加用户管理路由到主应用：
```javascript
app.use('/api/users', require('./routes/users'));
```

## 用户管理功能详解

### 1. 用户列表展示

**表格列：**
- 用户信息（头像、用户名、邮箱）
- 角色（管理员/普通用户/操作员/审批员/查看者）
- 状态（活跃/非活跃/已暂停）
- 电话
- 最后登录时间
- 创建时间
- 操作（编辑/删除）

### 2. 创建用户

**必填字段：**
- 用户名（至少3个字符）
- 邮箱（有效格式）
- 密码（至少6个字符）
- 角色

**可选字段：**
- 电话
- 组织
- 状态

### 3. 编辑用户

**可编辑字段：**
- 用户名
- 邮箱
- 电话
- 角色
- 组织
- 状态

**验证规则：**
- 用户名和邮箱不能与其他用户重复
- 必填字段不能为空

### 4. 删除用户

**安全检查：**
- 检查用户是否参与钱包
- 如果有关联钱包，禁止删除
- 显示确认对话框

### 5. 用户角色

**角色类型：**
- `admin` - 管理员（红色标签）
- `user` - 普通用户（蓝色标签）
- `operator` - 操作员（绿色标签）
- `approver` - 审批员（橙色标签）
- `viewer` - 查看者（灰色标签）

### 6. 用户状态

**状态类型：**
- `active` - 活跃（绿色标签）
- `inactive` - 非活跃（灰色标签）
- `suspended` - 已暂停（橙色标签）

## 钱包创建中的用户选择

### 问题解决

现在在钱包创建页面中，用户选择下拉框会显示所有可用的用户：

```typescript
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
```

### 用户数据流

1. **数据获取**: 应用启动时从 `/api/data/users` 获取用户列表
2. **数据更新**: 用户管理操作后自动刷新用户列表
3. **数据传递**: 用户列表传递给钱包管理组件
4. **用户选择**: 在钱包创建表单中显示用户选项

## 数据库支持

### 用户表结构

```sql
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20),
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'user', 'operator', 'approver', 'viewer') NOT NULL,
  organization VARCHAR(100),
  status ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP NULL
);
```

## 安全考虑

### 1. 认证和授权
- 所有用户管理 API 都需要 JWT 认证
- 密码使用 bcrypt 加密存储
- 敏感操作记录审计日志

### 2. 数据验证
- 前端表单验证
- 后端数据验证
- SQL 注入防护

### 3. 关联检查
- 删除用户前检查钱包参与关系
- 防止删除正在使用的用户

## 使用指南

### 1. 访问用户管理
1. 点击左侧菜单的"用户管理"
2. 页面显示所有用户列表

### 2. 添加用户
1. 点击"添加用户"按钮
2. 填写用户信息
3. 选择角色和状态
4. 点击"创建用户"

### 3. 编辑用户
1. 在用户列表中点击"编辑"按钮
2. 修改用户信息
3. 点击"更新用户"

### 4. 删除用户
1. 在用户列表中点击"删除"按钮
2. 确认删除操作
3. 系统会检查关联关系

### 5. 在钱包创建中选择用户
1. 进入钱包管理页面
2. 点击"创建钱包"
3. 在"参与用户"下拉框中选择用户
4. 可以多选用户

## 测试建议

### 1. 功能测试
- [ ] 用户列表正常显示
- [ ] 添加用户功能正常
- [ ] 编辑用户功能正常
- [ ] 删除用户功能正常
- [ ] 钱包创建时用户选择正常

### 2. 数据验证测试
- [ ] 必填字段验证
- [ ] 邮箱格式验证
- [ ] 用户名唯一性验证
- [ ] 密码强度验证

### 3. 权限测试
- [ ] 未认证用户无法访问
- [ ] 认证用户可以正常操作

## 总结

✅ **功能完成**
- 完整的用户管理界面
- 用户增删改查功能
- 钱包创建时的用户选择
- 后端 API 支持
- 数据库集成
- 安全验证

现在用户可以：
1. 在用户管理页面管理所有用户
2. 在创建钱包时选择参与用户
3. 查看用户状态和角色
4. 安全地添加、编辑、删除用户

用户管理功能已经完全实现并集成到系统中！ 