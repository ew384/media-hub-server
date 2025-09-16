'use client';

import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Typography,
  Space,
  Button,
  Table,
  Tag,
  Avatar,
  Progress,
  Tooltip,
  Spin,
  Alert,
} from 'antd';
import {
  UserOutlined,
  ShoppingCartOutlined,
  CrownOutlined,
  DollarOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { Line, Column, Pie } from '@ant-design/charts';
import { useDashboardStore, dashboardUtils } from '@/stores/dashboard';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

// 模拟数据 - 实际使用时会从API获取
const mockRecentOrders = [
  {
    id: 1,
    order_no: 'ORD202412001',
    user: { username: '张三', avatar: null },
    amount: 99.00,
    status: 'paid',
    created_at: '2024-12-01 10:30:00',
  },
  {
    id: 2,
    order_no: 'ORD202412002',
    user: { username: '李四', avatar: null },
    amount: 299.00,
    status: 'pending',
    created_at: '2024-12-01 09:15:00',
  },
  {
    id: 3,
    order_no: 'ORD202412003',
    user: { username: '王五', avatar: null },
    amount: 999.00,
    status: 'paid',
    created_at: '2024-12-01 08:45:00',
  },
];

const mockStats = {
  overview: {
    totalUsers: 15420,
    activeUsers: 8960,
    totalRevenue: 1580000,
    monthlyRevenue: 245000,
    conversionRate: 12.5,
    userGrowthRate: 15.8,
  },
  subscriptions: {
    activeSubscriptions: 3280,
    expiringSubscriptions: 156,
    planDistribution: {
      monthly: 1800,
      quarterly: 980,
      yearly: 500,
    },
  },
  payments: {
    todayOrders: 48,
    todayRevenue: 12800,
    successRate: 98.5,
    methodDistribution: {
      alipay: 65,
      wechat: 35,
    },
  },
};

export default function DashboardPage() {
  const router = useRouter();
  const {
    stats,
    isLoading,
    error,
    lastUpdated,
    fetchStats,
    fetchTrends,
    fetchRealtime,
    refreshAll,
  } = useDashboardStore();

  const [refreshing, setRefreshing] = useState(false);

  // 初始化数据
  useEffect(() => {
    fetchStats();
    fetchTrends();
    fetchRealtime();
  }, [fetchStats, fetchTrends, fetchRealtime]);

  // 刷新数据
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  // 订单状态配置
  const getOrderStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      paid: { color: 'green', text: '已支付' },
      pending: { color: 'orange', text: '待支付' },
      cancelled: { color: 'red', text: '已取消' },
      refunded: { color: 'purple', text: '已退款' },
    };
    return configs[status] || { color: 'default', text: status };
  };

  // 最近订单表格列
  const orderColumns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      render: (text: string) => (
        <Text copyable={{ text }} className="font-mono text-sm">
          {text}
        </Text>
      ),
    },
    {
      title: '用户',
      dataIndex: 'user',
      key: 'user',
      render: (user: any) => (
        <Space>
          <Avatar size="small" src={user.avatar} icon={<UserOutlined />} />
          <Text>{user.username}</Text>
        </Space>
      ),
    },
    {
      title: '金额',
      dataIndex: 'amount',
      key: 'amount',
      render: (amount: number) => (
        <Text className="font-medium">
          {dashboardUtils.formatMoney(amount)}
        </Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const config = getOrderStatusConfig(status);
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => (
        <Text className="text-sm text-gray-500">
          {dayjs(time).format('MM-DD HH:mm')}
        </Text>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/orders/${record.order_no}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  // 使用模拟数据或真实数据
  const currentStats = stats || mockStats;

  // 套餐分布图表数据
  const planDistributionData = [
    { type: '月度套餐', value: currentStats.subscriptions.planDistribution.monthly },
    { type: '季度套餐', value: currentStats.subscriptions.planDistribution.quarterly },
    { type: '年度套餐', value: currentStats.subscriptions.planDistribution.yearly },
  ];

  const planDistributionConfig = {
    data: planDistributionData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}%',
    },
    legend: {
      position: 'bottom' as const,
    },
    color: ['#1890ff', '#52c41a', '#faad14'],
  };

  // 支付方式分布图表数据
  const paymentMethodData = [
    { type: '支付宝', value: currentStats.payments.methodDistribution.alipay },
    { type: '微信支付', value: currentStats.payments.methodDistribution.wechat },
  ];

  const paymentMethodConfig = {
    data: paymentMethodData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name}: {percentage}%',
    },
    legend: {
      position: 'bottom' as const,
    },
    color: ['#1890ff', '#52c41a'],
  };

  if (error) {
    return (
      <Alert
        message="数据加载失败"
        description={error}
        type="error"
        showIcon
        action={
          <Button size="small" onClick={() => fetchStats()}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-2">
            数据概览
          </Title>
          <Text type="secondary">
            欢迎回来！这里是您的业务数据总览
            {lastUpdated && (
              <span className="ml-2">
                · 最后更新: {lastUpdated}
              </span>
            )}
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={refreshing}
        >
          刷新数据
        </Button>
      </div>

      {/* 关键指标卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="总用户数"
              value={currentStats.overview.totalUsers}
              prefix={<UserOutlined className="text-blue-500" />}
              suffix={
                <Tooltip title={`增长率: ${dashboardUtils.formatGrowthRate(currentStats.overview.userGrowthRate)}`}>
                  <div className="flex items-center text-xs ml-2">
                    <ArrowUpOutlined className="text-green-500" />
                    <span className="text-green-500 ml-1">
                      {currentStats.overview.userGrowthRate.toFixed(1)}%
                    </span>
                  </div>
                </Tooltip>
              }
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="活跃用户"
              value={currentStats.overview.activeUsers}
              prefix={<UserOutlined className="text-green-500" />}
              suffix={
                <div className="text-xs text-gray-500 ml-2">
                  /{currentStats.overview.totalUsers}
                </div>
              }
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={(currentStats.overview.activeUsers / currentStats.overview.totalUsers) * 100}
              size="small"
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="总收入"
              value={currentStats.overview.totalRevenue}
              prefix={<DollarOutlined className="text-orange-500" />}
              formatter={(value) => dashboardUtils.formatMoney(Number(value))}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="text-xs text-gray-500 mt-1">
              本月: {dashboardUtils.formatMoney(currentStats.overview.monthlyRevenue)}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <Card className="card-shadow">
            <Statistic
              title="付费转化率"
              value={currentStats.overview.conversionRate}
              prefix={<CrownOutlined className="text-purple-500" />}
              suffix="%"
              precision={1}
              valueStyle={{ color: '#722ed1' }}
            />
            <Progress
              percent={currentStats.overview.conversionRate}
              size="small"
              showInfo={false}
              strokeColor="#722ed1"
              className="mt-2"
            />
          </Card>
        </Col>
      </Row>

      {/* 订阅和支付数据 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="订阅统计" className="card-shadow">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Text>活跃订阅</Text>
                <Text className="font-semibold text-lg">
                  {currentStats.subscriptions.activeSubscriptions}
                </Text>
              </div>
              <div className="flex justify-between items-center">
                <Text>即将到期</Text>
                <Text className="font-semibold text-orange-500">
                  {currentStats.subscriptions.expiringSubscriptions}
                </Text>
              </div>
              <div className="pt-2 border-t">
                <Pie {...planDistributionConfig} height={200} />
              </div>
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="今日数据" className="card-shadow">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Text>今日订单</Text>
                <Text className="font-semibold text-lg">
                  {currentStats.payments.todayOrders}
                </Text>
              </div>
              <div className="flex justify-between items-center">
                <Text>今日收入</Text>
                <Text className="font-semibold text-green-500">
                  {dashboardUtils.formatMoney(currentStats.payments.todayRevenue)}
                </Text>
              </div>
              <div className="flex justify-between items-center">
                <Text>支付成功率</Text>
                <Text className="font-semibold">
                  {currentStats.payments.successRate}%
                </Text>
              </div>
              <Progress
                percent={currentStats.payments.successRate}
                size="small"
                strokeColor="#52c41a"
              />
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card title="支付方式分布" className="card-shadow">
            <Pie {...paymentMethodConfig} height={200} />
          </Card>
        </Col>
      </Row>

      {/* 最近订单 */}
      <Card
        title="最近订单"
        className="card-shadow"
        extra={
          <Button
            type="link"
            onClick={() => router.push('/orders')}
          >
            查看全部
          </Button>
        }
      >
        <Table
          columns={orderColumns}
          dataSource={mockRecentOrders}
          rowKey="id"
          pagination={false}
          size="small"
          loading={isLoading}
        />
      </Card>
    </div>
  );
}