'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Select,
  DatePicker,
  Space,
  Tag,
  Avatar,
  Dropdown,
  Modal,
  Form,
  message,
  Drawer,
  Descriptions,
  Typography,
  Row,
  Col,
  Statistic,
  Timeline,
  Tabs,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UserOutlined,
  MoreOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { userApi } from '@/lib/api';
import { usePermissions } from '@/stores/auth';
import { UserProfile, LoginHistory, SubscriptionHistory } from '@/types';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

// 模拟数据
const mockUsers: UserProfile[] = [
  {
    id: 1,
    username: 'zhangsan',
    phone: '13800138001',
    email: 'zhangsan@example.com',
    avatar: null,
    status: 1,
    created_at: '2024-01-15 10:30:00',
    updated_at: '2024-12-01 15:20:00',
    last_login_at: '2024-12-01 09:15:00',
    last_login_ip: '192.168.1.100',
    nickname: '张三',
    gender: 'male',
    subscription_status: 'active',
    subscription_expires_at: '2024-12-31 23:59:59',
    total_orders: 5,
    total_spent: 1500.00,
  },
  {
    id: 2,
    username: 'lisi',
    phone: '13800138002',
    email: 'lisi@example.com',
    avatar: null,
    status: 1,
    created_at: '2024-02-20 14:15:00',
    updated_at: '2024-11-28 10:45:00',
    last_login_at: '2024-11-28 10:45:00',
    last_login_ip: '192.168.1.101',
    nickname: '李四',
    gender: 'female',
    subscription_status: 'expired',
    subscription_expires_at: '2024-11-20 23:59:59',
    total_orders: 3,
    total_spent: 800.00,
  },
  {
    id: 3,
    username: 'wangwu',
    phone: '13800138003',
    email: 'wangwu@example.com',
    avatar: null,
    status: 0,
    created_at: '2024-03-10 09:00:00',
    updated_at: '2024-11-15 16:30:00',
    last_login_at: '2024-11-15 16:30:00',
    last_login_ip: '192.168.1.102',
    nickname: '王五',
    gender: 'male',
    subscription_status: 'none',
    total_orders: 0,
    total_spent: 0,
  },
];

export default function UsersPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>(mockUsers);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [userDetailVisible, setUserDetailVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    subscriptionStatus: 'all',
    dateRange: null as any,
  });

  const [form] = Form.useForm();
  const router = useRouter();
  const { checkPermission } = usePermissions();

  // 权限检查
  const canWrite = checkPermission('users:write');
  const canRead = checkPermission('users:read');

  // 分页配置
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: mockUsers.length,
  });

  // 获取用户列表
  const fetchUsers = async () => {
    if (!canRead) return;
    
    setLoading(true);
    try {
      // const response = await userApi.getUsers({
      //   current: pagination.current,
      //   pageSize: pagination.pageSize,
      //   ...filters,
      // });
      // setUsers(response.data);
      // setPagination(prev => ({ ...prev, total: response.pagination.total }));
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 应用过滤
      let filteredUsers = mockUsers;
      
      if (filters.search) {
        filteredUsers = filteredUsers.filter(user =>
          user.username.includes(filters.search) ||
          user.phone.includes(filters.search) ||
          user.email.includes(filters.search) ||
          (user.nickname && user.nickname.includes(filters.search))
        );
      }
      
      if (filters.status !== 'all') {
        filteredUsers = filteredUsers.filter(user =>
          user.status.toString() === filters.status
        );
      }
      
      if (filters.subscriptionStatus !== 'all') {
        filteredUsers = filteredUsers.filter(user =>
          user.subscription_status === filters.subscriptionStatus
        );
      }
      
      setUsers(filteredUsers);
      setPagination(prev => ({ ...prev, total: filteredUsers.length }));
    } catch (error) {
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.current, pagination.pageSize]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理过滤器变化
  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // 处理表格变化
  const handleTableChange = (paginationConfig: any) => {
    setPagination(prev => ({
      ...prev,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    }));
  };

  // 查看用户详情
  const handleViewUser = (user: UserProfile) => {
    setSelectedUser(user);
    setUserDetailVisible(true);
  };

  // 编辑用户
  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    form.setFieldsValue({
      username: user.username,
      phone: user.phone,
      email: user.email,
      nickname: user.nickname,
      status: user.status,
    });
    setEditModalVisible(true);
  };

  // 更新用户状态
  const handleUpdateStatus = async (userId: number, status: number) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    try {
      // await userApi.updateUserStatus(userId, status);
      message.success('用户状态更新成功');
      fetchUsers();
    } catch (error) {
      message.error('更新用户状态失败');
    }
  };

  // 保存用户编辑
  const handleSaveUser = async (values: any) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    try {
      // await userApi.updateUser(selectedUser!.id, values);
      message.success('用户信息更新成功');
      setEditModalVisible(false);
      fetchUsers();
    } catch (error) {
      message.error('更新用户信息失败');
    }
  };

  // 批量操作
  const handleBatchAction = async (action: string) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的用户');
      return;
    }

    Modal.confirm({
      title: '确认操作',
      content: `确定要对选中的 ${selectedRowKeys.length} 个用户执行 ${action} 操作吗？`,
      onOk: async () => {
        try {
          // await userApi.batchAction(action, selectedRowKeys as number[]);
          message.success(`批量${action}成功`);
          setSelectedRowKeys([]);
          fetchUsers();
        } catch (error) {
          message.error(`批量${action}失败`);
        }
      },
    });
  };

  // 导出数据
  const handleExport = () => {
    // 实现数据导出逻辑
    message.success('导出功能开发中');
  };

  // 表格列配置
  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      width: 250,
      render: (_, record: UserProfile) => (
        <div className="flex items-center space-x-3">
          <Avatar
            size={40}
            src={record.avatar}
            icon={<UserOutlined />}
            className="bg-blue-500"
          />
          <div>
            <div className="font-medium">{record.nickname || record.username}</div>
            <div className="text-sm text-gray-500">@{record.username}</div>
          </div>
        </div>
      ),
    },
    {
      title: '联系方式',
      key: 'contact',
      width: 200,
      render: (_, record: UserProfile) => (
        <div>
          <div className="text-sm">{record.phone}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: number) => (
        <Tag color={status === 1 ? 'green' : 'red'}>
          {status === 1 ? '正常' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '订阅状态',
      dataIndex: 'subscription_status',
      key: 'subscription_status',
      width: 100,
      render: (status: string, record: UserProfile) => {
        const statusConfig = {
          active: { color: 'green', text: '活跃' },
          expired: { color: 'orange', text: '已过期' },
          none: { color: 'gray', text: '未订阅' },
        };
        const config = statusConfig[status] || { color: 'gray', text: status };
        return (
          <div>
            <Tag color={config.color}>{config.text}</Tag>
            {status === 'active' && record.subscription_expires_at && (
              <div className="text-xs text-gray-500 mt-1">
                {dayjs(record.subscription_expires_at).format('YYYY-MM-DD')}到期
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: '订单数据',
      key: 'orderData',
      width: 120,
      render: (_, record: UserProfile) => (
        <div className="text-sm">
          <div>订单: {record.total_orders}</div>
          <div className="text-gray-500">消费: ¥{record.total_spent}</div>
        </div>
      ),
    },
    {
      title: '注册时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (time: string) => dayjs(time).format('YYYY-MM-DD'),
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 120,
      render: (time: string) => time ? dayjs(time).format('MM-DD HH:mm') : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right' as const,
      render: (_, record: UserProfile) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewUser(record)}
          >
            查看
          </Button>
          {canWrite && (
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'edit',
                    label: '编辑',
                    icon: <EditOutlined />,
                    onClick: () => handleEditUser(record),
                  },
                  {
                    key: 'status',
                    label: record.status === 1 ? '禁用' : '启用',
                    onClick: () => handleUpdateStatus(record.id, record.status === 1 ? 0 : 1),
                  },
                  {
                    type: 'divider',
                  },
                  {
                    key: 'resetPassword',
                    label: '重置密码',
                    onClick: () => {
                      Modal.confirm({
                        title: '确认重置密码',
                        content: `确定要重置用户 ${record.username} 的密码吗？`,
                        onOk: async () => {
                          try {
                            // await userApi.resetPassword(record.id);
                            message.success('密码重置成功');
                          } catch (error) {
                            message.error('密码重置失败');
                          }
                        },
                      });
                    },
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button type="link" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          )}
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    getCheckboxProps: (record: UserProfile) => ({
      disabled: !canWrite,
    }),
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-2">
            用户管理
          </Title>
          <Text type="secondary">
            管理系统用户，查看用户信息和订阅状态
          </Text>
        </div>
        <Space>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出数据
          </Button>
          {canWrite && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => router.push('/users/create')}
            >
              新增用户
            </Button>
          )}
        </Space>
      </div>

      {/* 筛选区域 */}
      <Card className="card-shadow">
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Search
                placeholder="搜索用户名、手机号、邮箱"
                allowClear
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                className="w-full"
              />
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <Select
                placeholder="用户状态"
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                className="w-full"
              >
                <Option value="all">全部状态</Option>
                <Option value="1">正常</Option>
                <Option value="0">禁用</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <Select
                placeholder="订阅状态"
                value={filters.subscriptionStatus}
                onChange={(value) => handleFilterChange('subscriptionStatus', value)}
                className="w-full"
              >
                <Option value="all">全部订阅</Option>
                <Option value="active">活跃</Option>
                <Option value="expired">已过期</Option>
                <Option value="none">未订阅</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <RangePicker
                placeholder={['开始日期', '结束日期']}
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange('dateRange', dates)}
                className="w-full"
              />
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => {
                    setFilters({
                      search: '',
                      status: 'all',
                      subscriptionStatus: 'all',
                      dateRange: null,
                    });
                  }}
                >
                  重置
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchUsers}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>

          {/* 批量操作 */}
          {canWrite && selectedRowKeys.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Text>已选择 {selectedRowKeys.length} 个用户</Text>
                <Space>
                  <Button size="small" onClick={() => handleBatchAction('启用')}>
                    批量启用
                  </Button>
                  <Button size="small" onClick={() => handleBatchAction('禁用')}>
                    批量禁用
                  </Button>
                  <Button size="small" onClick={() => handleBatchAction('发送通知')}>
                    发送通知
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 用户列表 */}
      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
          rowSelection={canWrite ? rowSelection : undefined}
          onChange={handleTableChange}
          scroll={{ x: 1200 }}
          size="middle"
        />
      </Card>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户详情"
        width={800}
        open={userDetailVisible}
        onClose={() => setUserDetailVisible(false)}
      >
        {selectedUser && <UserDetailContent user={selectedUser} />}
      </Drawer>

      {/* 编辑用户模态框 */}
      <Modal
        title="编辑用户"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSaveUser}
          className="mt-4"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[
              { required: true, message: '请输入用户名' },
              { min: 3, max: 20, message: '用户名长度为3-20个字符' },
            ]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item
            name="nickname"
            label="昵称"
          >
            <Input placeholder="请输入昵称" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="手机号"
            rules={[
              { required: true, message: '请输入手机号' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
            ]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱格式' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="status"
            label="状态"
            rules={[{ required: true, message: '请选择状态' }]}
          >
            <Select placeholder="请选择状态">
              <Option value={1}>正常</Option>
              <Option value={0}>禁用</Option>
            </Select>
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button onClick={() => setEditModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              保存
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

// 用户详情内容组件
function UserDetailContent({ user }: { user: UserProfile }) {
  const [activeTab, setActiveTab] = useState('info');

  // 模拟登录历史数据
  const mockLoginHistory: LoginHistory[] = [
    {
      id: 1,
      user_id: user.id,
      login_time: '2024-12-01 09:15:00',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      platform: 'Windows',
      location: '北京市',
    },
    {
      id: 2,
      user_id: user.id,
      login_time: '2024-11-30 14:30:00',
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      platform: 'iOS',
      location: '北京市',
    },
  ];

  // 模拟订阅历史数据
  const mockSubscriptionHistory: SubscriptionHistory[] = [
    {
      id: 1,
      user_id: user.id,
      plan_type: 'yearly',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      amount: 999,
      order_no: 'ORD202401001',
      created_at: '2024-01-01 10:00:00',
    },
    {
      id: 2,
      user_id: user.id,
      plan_type: 'monthly',
      start_date: '2023-12-01',
      end_date: '2023-12-31',
      amount: 99,
      order_no: 'ORD202312001',
      created_at: '2023-12-01 15:30:00',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 用户基本信息卡片 */}
      <Card>
        <div className="flex items-center space-x-4 mb-6">
          <Avatar
            size={80}
            src={user.avatar}
            icon={<UserOutlined />}
            className="bg-blue-500"
          />
          <div>
            <Title level={4} className="!mb-1">
              {user.nickname || user.username}
            </Title>
            <Text type="secondary" className="block">
              @{user.username}
            </Text>
            <div className="mt-2">
              <Tag color={user.status === 1 ? 'green' : 'red'}>
                {user.status === 1 ? '正常' : '禁用'}
              </Tag>
              <Tag color={user.subscription_status === 'active' ? 'blue' : 'orange'}>
                {user.subscription_status === 'active' ? '订阅中' : '未订阅'}
              </Tag>
            </div>
          </div>
        </div>

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Statistic
              title="总订单数"
              value={user.total_orders}
              suffix="个"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="总消费金额"
              value={user.total_spent}
              prefix="¥"
              precision={2}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="注册天数"
              value={dayjs().diff(dayjs(user.created_at), 'day')}
              suffix="天"
            />
          </Col>
        </Row>
      </Card>

      {/* 详细信息标签页 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="基本信息" key="info">
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
              <Descriptions.Item label="昵称">{user.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="手机号">{user.phone}</Descriptions.Item>
              <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
              <Descriptions.Item label="性别">
                {user.gender === 'male' ? '男' : user.gender === 'female' ? '女' : '未知'}
              </Descriptions.Item>
              <Descriptions.Item label="地区">{user.region || '-'}</Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {dayjs(user.created_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {dayjs(user.updated_at).format('YYYY-MM-DD HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录">
                {user.last_login_at ? dayjs(user.last_login_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="登录IP">{user.last_login_ip || '-'}</Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab="登录历史" key="login">
            <Timeline mode="left">
              {mockLoginHistory.map((item) => (
                <Timeline.Item key={item.id}>
                  <div className="space-y-1">
                    <div className="font-medium">
                      {dayjs(item.login_time).format('YYYY-MM-DD HH:mm:ss')}
                    </div>
                    <div className="text-sm text-gray-500">
                      IP: {item.ip_address} | 平台: {item.platform} | 位置: {item.location}
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </TabPane>

          <TabPane tab="订阅历史" key="subscription">
            <div className="space-y-4">
              {mockSubscriptionHistory.map((item) => (
                <Card key={item.id} size="small">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {item.plan_type === 'monthly' ? '月度套餐' : 
                         item.plan_type === 'quarterly' ? '季度套餐' : '年度套餐'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.start_date} ~ {item.end_date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">¥{item.amount}</div>
                      <div className="text-sm text-gray-500">{item.order_no}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}