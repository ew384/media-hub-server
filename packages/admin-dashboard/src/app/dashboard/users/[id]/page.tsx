'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Descriptions,
  Avatar,
  Tag,
  Button,
  Space,
  Tabs,
  Table,
  Timeline,
  Statistic,
  Row,
  Col,
  Modal,
  Form,
  Input,
  message,
  Spin,
  Alert,
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  ArrowLeftOutlined,
  CrownOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import { userApi, orderApi } from '@/lib/api';
import { UserProfile, OrderInfo, LoginHistory, SubscriptionHistory } from '@/types';
import { usePermissions } from '@/hooks/useAuth';
import { formatMoney, formatDateTime } from '@/lib/utils';
import dayjs from 'dayjs';

const { TabPane } = Tabs;

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = parseInt(params.id as string);
  
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([]);
  const [subscriptionHistory, setSubscriptionHistory] = useState<SubscriptionHistory[]>([]);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  const [editForm] = Form.useForm();
  const { checkPermission } = usePermissions();
  const canWrite = checkPermission('users:write');

  // 获取用户详情
  const fetchUserDetail = async () => {
    setLoading(true);
    try {
      // const userData = await userApi.getUserDetail(userId);
      // setUser(userData);
      
      // 模拟数据
      const mockUser: UserProfile = {
        id: userId,
        username: 'zhangsan',
        phone: '13800138001',
        email: 'zhangsan@example.com',
        avatar: '',
        status: 1,
        created_at: '2024-01-15 10:30:00',
        updated_at: '2024-12-01 15:20:00',
        last_login_at: '2024-12-01 09:15:00',
        last_login_ip: '192.168.1.100',
        nickname: '张三',
        gender: 'male',
        birthday: '1990-01-01',
        region: '北京市',
        bio: '资深自媒体从业者',
        subscription_status: 'active',
        subscription_expires_at: '2024-12-31 23:59:59',
        total_orders: 5,
        total_spent: 1500.00,
      };
      
      setUser(mockUser);
      
      // 获取相关数据
      await Promise.all([
        fetchUserOrders(),
        fetchLoginHistory(),
        fetchSubscriptionHistory(),
      ]);
    } catch (error) {
      message.error('获取用户详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户订单
  const fetchUserOrders = async () => {
    try {
      // const orderData = await orderApi.getUserOrders(userId);
      // setOrders(orderData);
      
      // 模拟数据
      const mockOrders: OrderInfo[] = [
        {
          id: 1,
          order_no: 'ORD202412001',
          user_id: userId,
          plan_type: 'yearly',
          amount: 999.00,
          original_amount: 1200.00,
          discount_amount: 201.00,
          status: 'paid',
          payment_method: 'alipay',
          payment_status: 'success',
          created_at: '2024-12-01 10:30:00',
          paid_at: '2024-12-01 10:35:00',
          expired_at: '2024-12-01 11:30:00',
        },
      ];
      setOrders(mockOrders);
    } catch (error) {
      console.error('获取订单失败:', error);
    }
  };

  // 获取登录历史
  const fetchLoginHistory = async () => {
    try {
      // const historyData = await userApi.getLoginHistory(userId);
      // setLoginHistory(historyData);
      
      // 模拟数据
      const mockHistory: LoginHistory[] = [
        {
          id: 1,
          user_id: userId,
          login_time: '2024-12-01 09:15:00',
          ip_address: '192.168.1.100',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          platform: 'Windows',
          location: '北京市',
        },
      ];
      setLoginHistory(mockHistory);
    } catch (error) {
      console.error('获取登录历史失败:', error);
    }
  };

  // 获取订阅历史
  const fetchSubscriptionHistory = async () => {
    try {
      // const subData = await userApi.getSubscriptionHistory(userId);
      // setSubscriptionHistory(subData);
      
      // 模拟数据
      const mockSubs: SubscriptionHistory[] = [
        {
          id: 1,
          user_id: userId,
          plan_type: 'yearly',
          start_date: '2024-01-01',
          end_date: '2024-12-31',
          amount: 999,
          order_no: 'ORD202401001',
          created_at: '2024-01-01 10:00:00',
        },
      ];
      setSubscriptionHistory(mockSubs);
    } catch (error) {
      console.error('获取订阅历史失败:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserDetail();
    }
  }, [userId]);

  // 编辑用户
  const handleEdit = () => {
    if (!user) return;
    
    editForm.setFieldsValue({
      username: user.username,
      nickname: user.nickname,
      phone: user.phone,
      email: user.email,
      bio: user.bio,
    });
    setEditModalVisible(true);
  };

  // 保存编辑
  const handleSaveEdit = async (values: any) => {
    if (!canWrite) {
      message.error('没有权限修改用户信息');
      return;
    }

    try {
      // await userApi.updateUser(userId, values);
      setUser(prev => prev ? { ...prev, ...values } : null);
      message.success('用户信息更新成功');
      setEditModalVisible(false);
    } catch (error) {
      message.error('用户信息更新失败');
    }
  };

  // 订单表格列
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      render: (text: string) => (
        <Button 
          type="link" 
          onClick={() => router.push(`/orders/${text}`)}
        >
          {text}
        </Button>
      ),
    },
    {
      title: '套餐类型',
      dataIndex: 'plan_type',
      key: 'plan_type',
      render: (type: string) => {
        const typeMap = {
          monthly: '月度套餐',
          quarterly: '季度套餐',
          yearly: '年度套餐',
        };
        return <Tag color="blue">{typeMap[type as keyof typeof typeMap]}</Tag>;
      },
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => formatMoney(amount),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap = {
          paid: { color: 'green', text: '已支付' },
          pending: { color: 'orange', text: '待支付' },
          cancelled: { color: 'red', text: '已取消' },
        };
        const config = statusMap[status as keyof typeof statusMap];
        return <Tag color={config?.color}>{config?.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => formatDateTime(time),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <Alert
        message="用户不存在"
        description="未找到指定的用户信息"
        type="error"
        showIcon
        action={
          <Button onClick={() => router.back()}>
            返回
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => router.back()}
          >
            返回
          </Button>
          <h1 className="text-2xl font-bold">用户详情</h1>
        </div>
        <Space>
          {canWrite && (
            <Button 
              type="primary" 
              icon={<EditOutlined />}
              onClick={handleEdit}
            >
              编辑用户
            </Button>
          )}
        </Space>
      </div>

      {/* 用户基本信息卡片 */}
      <Card>
        <div className="flex items-start space-x-6">
          <Avatar 
            size={100} 
            src={user.avatar} 
            icon={<UserOutlined />}
            className="bg-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-3">
              <h2 className="text-xl font-semibold">{user.nickname || user.username}</h2>
              <Tag color={user.status === 1 ? 'green' : 'red'}>
                {user.status === 1 ? '正常' : '禁用'}
              </Tag>
              {user.subscription_status === 'active' && (
                <Tag color="gold" icon={<CrownOutlined />}>
                  订阅中
                </Tag>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center space-x-2">
                <UserOutlined className="text-gray-500" />
                <span>@{user.username}</span>
              </div>
              <div className="flex items-center space-x-2">
                <PhoneOutlined className="text-gray-500" />
                <span>{user.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <MailOutlined className="text-gray-500" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center space-x-2">
                <ClockCircleOutlined className="text-gray-500" />
                <span>注册于 {dayjs(user.created_at).format('YYYY-MM-DD')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 统计数据 */}
        <Row gutter={16} className="mt-6 pt-6 border-t">
          <Col span={6}>
            <Statistic
              title="总订单数"
              value={user.total_orders}
              prefix={<ShoppingCartOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="总消费金额"
              value={user.total_spent}
              formatter={(value) => formatMoney(Number(value))}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="注册天数"
              value={dayjs().diff(dayjs(user.created_at), 'day')}
              suffix="天"
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="最后登录"
              value={user.last_login_at ? dayjs(user.last_login_at).fromNow() : '从未登录'}
            />
          </Col>
        </Row>
      </Card>

      {/* 详细信息标签页 */}
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="基本信息" key="info">
            <Descriptions column={2} bordered>
              <Descriptions.Item label="用户名">{user.username}</Descriptions.Item>
              <Descriptions.Item label="昵称">{user.nickname || '-'}</Descriptions.Item>
              <Descriptions.Item label="性别">
                {user.gender === 'male' ? '男' : user.gender === 'female' ? '女' : '未知'}
              </Descriptions.Item>
              <Descriptions.Item label="生日">{user.birthday || '-'}</Descriptions.Item>
              <Descriptions.Item label="地区">{user.region || '-'}</Descriptions.Item>
              <Descriptions.Item label="个人简介" span={2}>
                {user.bio || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="订阅状态">
                <Tag color={user.subscription_status === 'active' ? 'green' : 'orange'}>
                  {user.subscription_status === 'active' ? '活跃' : '已过期'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="订阅到期时间">
                {user.subscription_expires_at ? 
                  formatDateTime(user.subscription_expires_at) : '-'
                }
              </Descriptions.Item>
              <Descriptions.Item label="注册时间">
                {formatDateTime(user.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="最后更新">
                {formatDateTime(user.updated_at)}
              </Descriptions.Item>
              <Descriptions.Item label="最后登录IP">
                {user.last_login_ip || '-'}
              </Descriptions.Item>
            </Descriptions>
          </TabPane>

          <TabPane tab="订单历史" key="orders">
            <Table
              columns={orderColumns}
              dataSource={orders}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          </TabPane>

          <TabPane tab="登录历史" key="login">
            <Timeline>
              {loginHistory.map((item) => (
                <Timeline.Item key={item.id}>
                  <div>
                    <div className="font-medium">
                      {formatDateTime(item.login_time)}
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
              {subscriptionHistory.map((item) => (
                <Card key={item.id} size="small">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">
                        {item.plan_type === 'yearly' ? '年度套餐' : 
                         item.plan_type === 'quarterly' ? '季度套餐' : '月度套餐'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {item.start_date} ~ {item.end_date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatMoney(item.amount)}</div>
                      <div className="text-sm text-gray-500">{item.order_no}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabPane>
        </Tabs>
      </Card>

      {/* 编辑用户模态框 */}
      <Modal
        title="编辑用户信息"
        open={editModalVisible}
        onCancel={() => setEditModalVisible(false)}
        footer={null}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={handleSaveEdit}
          className="mt-4"
        >
          <Form.Item
            name="username"
            label="用户名"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input placeholder="请输入用户名" />
          </Form.Item>

          <Form.Item name="nickname" label="昵称">
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

          <Form.Item name="bio" label="个人简介">
            <Input.TextArea rows={3} placeholder="请输入个人简介" />
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