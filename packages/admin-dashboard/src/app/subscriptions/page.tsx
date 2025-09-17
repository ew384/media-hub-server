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
  Modal,
  Form,
  InputNumber,
  message,
  Row,
  Col,
  Statistic,
  Progress,
  Alert,
  Tooltip,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
  PlusOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  UserOutlined,
  CalendarOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { SubscriptionInfo, PlanConfig } from '@/types';
import { usePermissions } from '@/stores/auth';
import { SUBSCRIPTION_STATUS, PLAN_TYPES } from '@/lib/constants';
import { formatDateTime, formatRelativeTime, formatMoney } from '@/lib/utils';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

// 模拟数据
const mockSubscriptions: SubscriptionInfo[] = [
  {
    id: 1,
    user_id: 1,
    user: {
      id: 1,
      username: 'zhangsan',
      phone: '13800138001',
      email: 'zhangsan@example.com',
      status: 1,
      created_at: '2024-01-15 10:30:00',
      updated_at: '2024-12-01 15:20:00',
    },
    plan_type: 'yearly',
    status: 'active',
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    auto_renew: true,
    created_at: '2024-01-01 10:00:00',
    updated_at: '2024-01-01 10:00:00',
  },
  {
    id: 2,
    user_id: 2,
    user: {
      id: 2,
      username: 'lisi',
      phone: '13800138002',
      email: 'lisi@example.com',
      status: 1,
      created_at: '2024-02-20 14:15:00',
      updated_at: '2024-11-28 10:45:00',
    },
    plan_type: 'monthly',
    status: 'expired',
    start_date: '2024-11-01',
    end_date: '2024-11-30',
    auto_renew: false,
    created_at: '2024-11-01 09:00:00',
    updated_at: '2024-11-30 23:59:59',
  },
  {
    id: 3,
    user_id: 3,
    user: {
      id: 3,
      username: 'wangwu',
      phone: '13800138003',
      email: 'wangwu@example.com',
      status: 0,
      created_at: '2024-03-10 09:00:00',
      updated_at: '2024-11-15 16:30:00',
    },
    plan_type: 'quarterly',
    status: 'cancelled',
    start_date: '2024-09-01',
    end_date: '2024-11-30',
    auto_renew: false,
    created_at: '2024-09-01 14:30:00',
    updated_at: '2024-10-15 10:20:00',
  },
];

const mockPlanConfigs: PlanConfig[] = [
  {
    id: 1,
    name: '月度套餐',
    type: 'monthly',
    price: 99,
    original_price: 99,
    features: ['基础功能', '5个账号', '邮件支持'],
    is_popular: false,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 2,
    name: '季度套餐',
    type: 'quarterly',
    price: 279,
    original_price: 297,
    features: ['基础功能', '15个账号', '优先支持'],
    is_popular: true,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 3,
    name: '年度套餐',
    type: 'yearly',
    price: 999,
    original_price: 1188,
    features: ['全部功能', '无限账号', '专属客服'],
    is_popular: false,
    is_active: true,
    sort_order: 3,
  },
];

export default function SubscriptionsPage() {
  const [loading, setLoading] = useState(false);
  const [subscriptions, setSubscriptions] = useState<SubscriptionInfo[]>(mockSubscriptions);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [extendModalVisible, setExtendModalVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionInfo | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    planType: 'all',
    dateRange: null as any,
    expiringIn: 'all',
  });

  const [extendForm] = Form.useForm();
  const { checkPermission } = usePermissions();

  // 权限检查
  const canWrite = checkPermission('subscriptions:write');
  const canRead = checkPermission('subscriptions:read');

  // 分页配置
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: mockSubscriptions.length,
  });

  // 获取订阅列表
  const fetchSubscriptions = async () => {
    if (!canRead) return;
    
    setLoading(true);
    try {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 应用过滤
      let filteredSubscriptions = mockSubscriptions;
      
      if (filters.search) {
        filteredSubscriptions = filteredSubscriptions.filter(sub =>
          sub.user?.username.includes(filters.search) ||
          sub.user?.phone.includes(filters.search) ||
          sub.user?.email.includes(filters.search)
        );
      }
      
      if (filters.status !== 'all') {
        filteredSubscriptions = filteredSubscriptions.filter(sub =>
          sub.status === filters.status
        );
      }
      
      if (filters.planType !== 'all') {
        filteredSubscriptions = filteredSubscriptions.filter(sub =>
          sub.plan_type === filters.planType
        );
      }
      
      if (filters.expiringIn !== 'all') {
        const now = dayjs();
        const days = parseInt(filters.expiringIn);
        filteredSubscriptions = filteredSubscriptions.filter(sub => {
          if (sub.status !== 'active') return false;
          const endDate = dayjs(sub.end_date);
          return endDate.diff(now, 'day') <= days;
        });
      }
      
      setSubscriptions(filteredSubscriptions);
      setPagination(prev => ({ ...prev, total: filteredSubscriptions.length }));
    } catch (error) {
      message.error('获取订阅列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
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

  // 延长订阅
  const handleExtendSubscription = (subscription: SubscriptionInfo) => {
    setSelectedSubscription(subscription);
    extendForm.setFieldsValue({
      days: 30,
      reason: '',
    });
    setExtendModalVisible(true);
  };

  // 确认延长订阅
  const handleConfirmExtend = async (values: any) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    try {
      // await subscriptionApi.extendSubscription(selectedSubscription!.id, values.days, values.reason);
      message.success(`订阅延长${values.days}天成功`);
      setExtendModalVisible(false);
      fetchSubscriptions();
    } catch (error) {
      message.error('订阅延长失败');
    }
  };

  // 取消订阅
  const handleCancelSubscription = (subscription: SubscriptionInfo) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    Modal.confirm({
      title: '确认取消订阅',
      content: `确定要取消用户 ${subscription.user?.username} 的订阅吗？`,
      onOk: async () => {
        try {
          // await subscriptionApi.cancelSubscription(subscription.id);
          message.success('订阅取消成功');
          fetchSubscriptions();
        } catch (error) {
          message.error('订阅取消失败');
        }
      },
    });
  };

  // 批量操作
  const handleBatchAction = async (action: string) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的订阅');
      return;
    }

    Modal.confirm({
      title: '确认操作',
      content: `确定要对选中的 ${selectedRowKeys.length} 个订阅执行 ${action} 操作吗？`,
      onOk: async () => {
        try {
          // await subscriptionApi.batchAction(action, selectedRowKeys as number[]);
          message.success(`批量${action}成功`);
          setSelectedRowKeys([]);
          fetchSubscriptions();
        } catch (error) {
          message.error(`批量${action}失败`);
        }
      },
    });
  };

  // 获取订阅状态配置
  const getSubscriptionStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      active: { color: 'green', text: '活跃', icon: <CrownOutlined /> },
      expired: { color: 'orange', text: '已过期', icon: <ClockCircleOutlined /> },
      cancelled: { color: 'red', text: '已取消', icon: <CloseCircleOutlined /> },
    };
    return configs[status] || { color: 'default', text: status, icon: null };
  };

  // 获取套餐类型显示
  const getPlanTypeText = (planType: string) => {
    const types: Record<string, string> = {
      monthly: '月度套餐',
      quarterly: '季度套餐',
      yearly: '年度套餐',
    };
    return types[planType] || planType;
  };

  // 计算剩余天数
  const getRemainingDays = (endDate: string) => {
    const now = dayjs();
    const end = dayjs(endDate);
    const days = end.diff(now, 'day');
    return Math.max(0, days);
  };

  // 表格列配置
  const columns = [
    {
      title: '用户信息',
      key: 'userInfo',
      width: 200,
      render: (_, record: SubscriptionInfo) => (
        <div>
          <div className="font-medium">{record.user?.username}</div>
          <div className="text-sm text-gray-500">{record.user?.phone}</div>
        </div>
      ),
    },
    {
      title: '套餐类型',
      dataIndex: 'plan_type',
      key: 'plan_type',
      width: 120,
      render: (planType: string) => (
        <Tag color="blue">{getPlanTypeText(planType)}</Tag>
      ),
    },
    {
      title: '订阅状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = getSubscriptionStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '订阅时间',
      key: 'duration',
      width: 180,
      render: (_, record: SubscriptionInfo) => (
        <div>
          <div className="text-sm">
            开始: {dayjs(record.start_date).format('YYYY-MM-DD')}
          </div>
          <div className="text-sm">
            结束: {dayjs(record.end_date).format('YYYY-MM-DD')}
          </div>
        </div>
      ),
    },
    {
      title: '剩余天数',
      key: 'remainingDays',
      width: 100,
      render: (_, record: SubscriptionInfo) => {
        if (record.status !== 'active') return '-';
        
        const days = getRemainingDays(record.end_date);
        let color = 'green';
        if (days <= 7) color = 'red';
        else if (days <= 30) color = 'orange';
        
        return (
          <Text style={{ color }}>
            {days}天
          </Text>
        );
      },
    },
    {
      title: '自动续费',
      dataIndex: 'auto_renew',
      key: 'auto_renew',
      width: 100,
      render: (autoRenew: boolean) => (
        <Tag color={autoRenew ? 'green' : 'gray'}>
          {autoRenew ? '已开启' : '已关闭'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (time: string) => (
        <div>
          <div>{dayjs(time).format('YYYY-MM-DD')}</div>
          <div className="text-sm text-gray-500">
            {dayjs(time).format('HH:mm:ss')}
          </div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right' as const,
      render: (_, record: SubscriptionInfo) => (
        <Space size="small" wrap>
          {canWrite && record.status === 'active' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleExtendSubscription(record)}
            >
              延期
            </Button>
          )}
          {canWrite && record.status === 'active' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleCancelSubscription(record)}
            >
              取消
            </Button>
          )}
          <Button
            type="link"
            size="small"
            onClick={() => {
              // 跳转到用户详情页
              window.open(`/users/${record.user_id}`, '_blank');
            }}
          >
            查看用户
          </Button>
        </Space>
      ),
    },
  ];

  // 计算统计数据
  const stats = {
    total: subscriptions.length,
    active: subscriptions.filter(s => s.status === 'active').length,
    expired: subscriptions.filter(s => s.status === 'expired').length,
    expiringIn7Days: subscriptions.filter(s => 
      s.status === 'active' && getRemainingDays(s.end_date) <= 7
    ).length,
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
    getCheckboxProps: (record: SubscriptionInfo) => ({
      disabled: !canWrite,
    }),
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-2">
            订阅管理
          </Title>
          <Text type="secondary">
            管理用户订阅，处理续费和到期提醒
          </Text>
        </div>
        <Space>
          <Button icon={<ExportOutlined />}>
            导出数据
          </Button>
        </Space>
      </div>

      {/* 统计卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="总订阅数"
              value={stats.total}
              prefix={<CrownOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="活跃订阅"
              value={stats.active}
              prefix={<UserOutlined className="text-green-500" />}
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={stats.total > 0 ? (stats.active / stats.total) * 100 : 0}
              size="small"
              showInfo={false}
              className="mt-2"
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="已过期"
              value={stats.expired}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="7天内到期"
              value={stats.expiringIn7Days}
              prefix={<ClockCircleOutlined className="text-red-500" />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 到期提醒 */}
      {stats.expiringIn7Days > 0 && (
        <Alert
          message="订阅到期提醒"
          description={`有 ${stats.expiringIn7Days} 个订阅将在7天内到期，请及时处理`}
          type="warning"
          showIcon
          action={
            <Button
              size="small"
              onClick={() => handleFilterChange('expiringIn', '7')}
            >
              查看详情
            </Button>
          }
        />
      )}

      {/* 筛选区域 */}
      <Card className="card-shadow">
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Search
                placeholder="搜索用户名、手机号、邮箱"
                allowClear
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                className="w-full"
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="订阅状态"
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                className="w-full"
              >
                <Option value="all">全部状态</Option>
                <Option value="active">活跃</Option>
                <Option value="expired">已过期</Option>
                <Option value="cancelled">已取消</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="套餐类型"
                value={filters.planType}
                onChange={(value) => handleFilterChange('planType', value)}
                className="w-full"
              >
                <Option value="all">全部套餐</Option>
                <Option value="monthly">月度套餐</Option>
                <Option value="quarterly">季度套餐</Option>
                <Option value="yearly">年度套餐</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="到期时间"
                value={filters.expiringIn}
                onChange={(value) => handleFilterChange('expiringIn', value)}
                className="w-full"
              >
                <Option value="all">全部</Option>
                <Option value="7">7天内到期</Option>
                <Option value="30">30天内到期</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <RangePicker
                placeholder={['开始日期', '结束日期']}
                value={filters.dateRange}
                onChange={(dates) => handleFilterChange('dateRange', dates)}
                className="w-full"
              />
            </Col>
          </Row>

          {/* 批量操作 */}
          {canWrite && selectedRowKeys.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <Text>已选择 {selectedRowKeys.length} 个订阅</Text>
                <Space>
                  <Button size="small" onClick={() => handleBatchAction('延期')}>
                    批量延期
                  </Button>
                  <Button size="small" onClick={() => handleBatchAction('取消')}>
                    批量取消
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

      {/* 订阅列表 */}
      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={subscriptions}
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
          onChange={(paginationConfig) => {
            setPagination(prev => ({
              ...prev,
              current: paginationConfig.current || 1,
              pageSize: paginationConfig.pageSize || 20,
            }));
          }}
          scroll={{ x: 1400 }}
          size="middle"
        />
      </Card>

      {/* 延期订阅模态框 */}
      <Modal
        title="延长订阅"
        open={extendModalVisible}
        onCancel={() => setExtendModalVisible(false)}
        footer={null}
      >
        <Form
          form={extendForm}
          layout="vertical"
          onFinish={handleConfirmExtend}
          className="mt-4"
        >
          <Form.Item
            name="days"
            label="延长天数"
            rules={[
              { required: true, message: '请输入延长天数' },
              { type: 'number', min: 1, max: 365, message: '延长天数为1-365天' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={365}
              placeholder="请输入延长天数"
              suffix="天"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="延长原因"
          >
            <Input.TextArea
              rows={3}
              placeholder="请输入延长原因（可选）"
              maxLength={200}
              showCount
            />
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button onClick={() => setExtendModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              确认延长
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}