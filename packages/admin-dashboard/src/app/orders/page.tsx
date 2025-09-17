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
  Drawer,
  Descriptions,
  Typography,
  Row,
  Col,
  Statistic,
  Timeline,
  Steps,
} from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  ReloadOutlined,
  ExportOutlined,
  FilterOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ShoppingCartOutlined, // ✅ 添加缺失的导入
} from '@ant-design/icons';
import { orderApi } from '@/lib/api';
import { usePermissions } from '@/stores/auth';
import { OrderInfo, OrderTimeline } from '@/types';
import { dashboardUtils } from '@/stores/dashboard';
import dayjs from 'dayjs';

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Title } = Typography;
const { TextArea } = Input;
const { Step } = Steps;

// 模拟数据
const mockOrders: OrderInfo[] = [
  {
    id: 1,
    order_no: 'ORD202412001',
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
    amount: 999.00,
    original_amount: 1200.00,
    discount_amount: 201.00,
    status: 'paid',
    payment_method: 'alipay',
    payment_status: 'success',
    created_at: '2024-12-01 10:30:00',
    paid_at: '2024-12-01 10:35:00',
    expired_at: '2024-12-01 11:30:00',
    notes: '年度套餐优惠活动',
  },
  {
    id: 2,
    order_no: 'ORD202412002',
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
    amount: 99.00,
    original_amount: 99.00,
    discount_amount: 0,
    status: 'pending',
    payment_method: 'wechat',
    payment_status: 'pending',
    created_at: '2024-12-01 09:15:00',
    expired_at: '2024-12-01 10:15:00',
  },
  {
    id: 3,
    order_no: 'ORD202412003',
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
    amount: 299.00,
    original_amount: 299.00,
    discount_amount: 0,
    status: 'cancelled',
    payment_method: 'alipay',
    payment_status: 'failed',
    created_at: '2024-11-30 16:20:00',
    expired_at: '2024-11-30 17:20:00',
  },
];

export default function OrdersPage() {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<OrderInfo[]>(mockOrders);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderInfo | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    paymentMethod: 'all',
    dateRange: null as any,
    amountRange: [null, null] as [number | null, number | null],
  });

  const [refundForm] = Form.useForm();
  const { checkPermission } = usePermissions();

  // 权限检查
  const canWrite = checkPermission('orders:write');
  const canRead = checkPermission('orders:read');

  // 分页配置
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: mockOrders.length,
  });

  // 获取订单列表
  const fetchOrders = async () => {
    if (!canRead) return;
    
    setLoading(true);
    try {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 应用过滤
      let filteredOrders = mockOrders;
      
      if (filters.search) {
        filteredOrders = filteredOrders.filter(order =>
          order.order_no.includes(filters.search) ||
          order.user?.username.includes(filters.search) ||
          order.user?.phone.includes(filters.search)
        );
      }
      
      if (filters.status !== 'all') {
        filteredOrders = filteredOrders.filter(order =>
          order.status === filters.status
        );
      }
      
      if (filters.paymentMethod !== 'all') {
        filteredOrders = filteredOrders.filter(order =>
          order.payment_method === filters.paymentMethod
        );
      }
      
      setOrders(filteredOrders);
      setPagination(prev => ({ ...prev, total: filteredOrders.length }));
    } catch (error) {
      message.error('获取订单列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
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

  // 查看订单详情
  const handleViewOrder = (order: OrderInfo) => {
    setSelectedOrder(order);
    setOrderDetailVisible(true);
  };

  // 申请退款
  const handleRefund = (order: OrderInfo) => {
    setSelectedOrder(order);
    refundForm.setFieldsValue({
      amount: order.amount,
      reason: '',
    });
    setRefundModalVisible(true);
  };

  // 确认退款
  const handleConfirmRefund = async (values: any) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    try {
      // await orderApi.refundOrder(selectedOrder!.order_no, values);
      message.success('退款申请提交成功');
      setRefundModalVisible(false);
      fetchOrders();
    } catch (error) {
      message.error('退款申请失败');
    }
  };

  // 取消订单
  const handleCancelOrder = (orderNo: string) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    Modal.confirm({
      title: '确认取消订单',
      content: `确定要取消订单 ${orderNo} 吗？`,
      onOk: async () => {
        try {
          // await orderApi.cancelOrder(orderNo);
          message.success('订单取消成功');
          fetchOrders();
        } catch (error) {
          message.error('订单取消失败');
        }
      },
    });
  };

  // 手动确认订单
  const handleConfirmOrder = (orderNo: string) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    Modal.confirm({
      title: '确认订单',
      content: `确定要手动确认订单 ${orderNo} 吗？`,
      onOk: async () => {
        try {
          // await orderApi.confirmOrder(orderNo);
          message.success('订单确认成功');
          fetchOrders();
        } catch (error) {
          message.error('订单确认失败');
        }
      },
    });
  };

  // 获取订单状态配置
  const getOrderStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      pending: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
      paid: { color: 'green', text: '已支付', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: '已取消', icon: <CloseCircleOutlined /> },
      refunded: { color: 'purple', text: '已退款', icon: <DollarOutlined /> },
      expired: { color: 'gray', text: '已过期', icon: <ClockCircleOutlined /> },
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

  // 获取支付方式显示
  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
    };
    return methods[method] || method;
  };

  // 表格列配置
  const columns = [
    {
      title: '订单号',
      dataIndex: 'order_no',
      key: 'order_no',
      width: 160,
      render: (text: string) => (
        <Text copyable={{ text }} className="font-mono text-sm">
          {text}
        </Text>
      ),
    },
    {
      title: '用户信息',
      key: 'userInfo',
      width: 150,
      render: (_, record: OrderInfo) => (
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
      width: 100,
      render: (planType: string) => (
        <Tag color="blue">{getPlanTypeText(planType)}</Tag>
      ),
    },
    {
      title: '金额信息',
      key: 'amount',
      width: 120,
      render: (_, record: OrderInfo) => (
        <div>
          <div className="font-medium text-lg">
            {dashboardUtils.formatMoney(record.amount)}
          </div>
          {record.discount_amount > 0 && (
            <div className="text-sm text-gray-500">
              原价: {dashboardUtils.formatMoney(record.original_amount)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '订单状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config = getOrderStatusConfig(status);
        return (
          <Tag color={config.color} icon={config.icon}>
            {config.text}
          </Tag>
        );
      },
    },
    {
      title: '支付方式',
      dataIndex: 'payment_method',
      key: 'payment_method',
      width: 100,
      render: (method: string) => getPaymentMethodText(method),
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
      title: '支付时间',
      dataIndex: 'paid_at',
      key: 'paid_at',
      width: 140,
      render: (time: string) => time ? (
        <div>
          <div>{dayjs(time).format('YYYY-MM-DD')}</div>
          <div className="text-sm text-gray-500">
            {dayjs(time).format('HH:mm:ss')}
          </div>
        </div>
      ) : '-',
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      fixed: 'right' as const,
      render: (_, record: OrderInfo) => (
        <Space size="small" wrap>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewOrder(record)}
          >
            查看
          </Button>
          {canWrite && record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleConfirmOrder(record.order_no)}
            >
              确认
            </Button>
          )}
          {canWrite && record.status === 'pending' && (
            <Button
              type="link"
              size="small"
              danger
              onClick={() => handleCancelOrder(record.order_no)}
            >
              取消
            </Button>
          )}
          {canWrite && record.status === 'paid' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleRefund(record)}
            >
              退款
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="!mb-2">
            订单管理
          </Title>
          <Text type="secondary">
            管理系统订单，处理支付和退款
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
              title="今日订单"
              value={mockOrders.filter(o => 
                dayjs(o.created_at).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD')
              ).length}
              prefix={<ShoppingCartOutlined className="text-blue-500" />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="今日收入"
              value={mockOrders
                .filter(o => 
                  dayjs(o.created_at).format('YYYY-MM-DD') === dayjs().format('YYYY-MM-DD') &&
                  o.status === 'paid'
                )
                .reduce((sum, o) => sum + o.amount, 0)
              }
              prefix="¥"
              precision={2}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="待支付订单"
              value={mockOrders.filter(o => o.status === 'pending').length}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="card-shadow">
            <Statistic
              title="支付成功率"
              value={
                (mockOrders.filter(o => o.status === 'paid').length / 
                mockOrders.filter(o => o.status !== 'pending').length) * 100
              }
              suffix="%"
              precision={1}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 筛选区域 */}
      <Card className="card-shadow">
        <div className="space-y-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Search
                placeholder="搜索订单号、用户名、手机号"
                allowClear
                onSearch={handleSearch}
                onChange={(e) => !e.target.value && handleSearch('')}
                className="w-full"
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="订单状态"
                value={filters.status}
                onChange={(value) => handleFilterChange('status', value)}
                className="w-full"
              >
                <Option value="all">全部状态</Option>
                <Option value="pending">待支付</Option>
                <Option value="paid">已支付</Option>
                <Option value="cancelled">已取消</Option>
                <Option value="refunded">已退款</Option>
                <Option value="expired">已过期</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select
                placeholder="支付方式"
                value={filters.paymentMethod}
                onChange={(value) => handleFilterChange('paymentMethod', value)}
                className="w-full"
              >
                <Option value="all">全部方式</Option>
                <Option value="alipay">支付宝</Option>
                <Option value="wechat">微信支付</Option>
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
            <Col xs={24} sm={12} md={4}>
              <Space>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => {
                    setFilters({
                      search: '',
                      status: 'all',
                      paymentMethod: 'all',
                      dateRange: null,
                      amountRange: [null, null],
                    });
                  }}
                >
                  重置
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchOrders}
                  loading={loading}
                >
                  刷新
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </Card>

      {/* 订单列表 */}
      <Card className="card-shadow">
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
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

      {/* 订单详情抽屉 */}
      <Drawer
        title="订单详情"
        width={800}
        open={orderDetailVisible}
        onClose={() => setOrderDetailVisible(false)}
      >
        {selectedOrder && <OrderDetailContent order={selectedOrder} />}
      </Drawer>

      {/* 退款模态框 */}
      <Modal
        title="申请退款"
        open={refundModalVisible}
        onCancel={() => setRefundModalVisible(false)}
        footer={null}
      >
        <Form
          form={refundForm}
          layout="vertical"
          onFinish={handleConfirmRefund}
          className="mt-4"
        >
          <Form.Item
            name="amount"
            label="退款金额"
            rules={[
              { required: true, message: '请输入退款金额' },
              { type: 'number', min: 0.01, message: '退款金额必须大于0' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={selectedOrder?.amount}
              precision={2}
              formatter={(value) => `¥ ${value}`}
              parser={(value) => value!.replace(/¥\s?|(,*)/g, '')}
              placeholder="请输入退款金额"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="退款原因"
            rules={[{ required: true, message: '请输入退款原因' }]}
          >
            <TextArea
              rows={4}
              placeholder="请详细说明退款原因"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button onClick={() => setRefundModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              确认退款
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}

// 订单详情内容组件
function OrderDetailContent({ order }: { order: OrderInfo }) {
  // 模拟订单时间线数据
  const mockTimeline: OrderTimeline[] = [
    {
      id: 1,
      order_no: order.order_no,
      event: 'order_created',
      description: '订单创建',
      operator: '系统',
      created_at: order.created_at,
    },
    ...(order.paid_at ? [{
      id: 2,
      order_no: order.order_no,
      event: 'payment_success',
      description: '支付成功',
      operator: '系统',
      created_at: order.paid_at,
    }] : []),
  ];

  // 获取订单状态配置 (需要在这里重新定义，因为是组件内部函数)
  const getOrderStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      pending: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
      paid: { color: 'green', text: '已支付', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: '已取消', icon: <CloseCircleOutlined /> },
      refunded: { color: 'purple', text: '已退款', icon: <DollarOutlined /> },
      expired: { color: 'gray', text: '已过期', icon: <ClockCircleOutlined /> },
    };
    return configs[status] || { color: 'default', text: status, icon: null };
  };

  // 获取套餐类型显示 (重新定义)
  const getPlanTypeText = (planType: string) => {
    const types: Record<string, string> = {
      monthly: '月度套餐',
      quarterly: '季度套餐',
      yearly: '年度套餐',
    };
    return types[planType] || planType;
  };

  // 获取支付方式显示 (重新定义)
  const getPaymentMethodText = (method: string) => {
    const methods: Record<string, string> = {
      alipay: '支付宝',
      wechat: '微信支付',
    };
    return methods[method] || method;
  };

  // 获取订单状态步骤
  const getOrderSteps = () => {
    const steps = [
      { title: '订单创建', status: 'finish' },
      { title: '等待支付', status: order.status === 'pending' ? 'process' : 'finish' },
      { title: '支付完成', status: order.status === 'paid' ? 'finish' : 'wait' },
    ];

    if (order.status === 'cancelled') {
      steps[1].status = 'error';
      steps[2].status = 'wait';
    } else if (order.status === 'refunded') {
      steps.push({ title: '已退款', status: 'finish' });
    }

    return steps;
  };

  return (
    <div className="space-y-6">
      {/* 订单基本信息 */}
      <Card title="订单信息">
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="订单号">{order.order_no}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            {(() => {
              const config = getOrderStatusConfig(order.status);
              return <Tag color={config.color} icon={config.icon}>{config.text}</Tag>;
            })()}
          </Descriptions.Item>
          <Descriptions.Item label="套餐类型">{getPlanTypeText(order.plan_type)}</Descriptions.Item>
          <Descriptions.Item label="支付方式">{getPaymentMethodText(order.payment_method)}</Descriptions.Item>
          <Descriptions.Item label="订单金额">
            {dashboardUtils.formatMoney(order.amount)}
          </Descriptions.Item>
          <Descriptions.Item label="原价">
            {dashboardUtils.formatMoney(order.original_amount)}
          </Descriptions.Item>
          <Descriptions.Item label="优惠金额">
            {dashboardUtils.formatMoney(order.discount_amount)}
          </Descriptions.Item>
          <Descriptions.Item label="实付金额">
            <Text className="text-lg font-semibold text-red-500">
              {dashboardUtils.formatMoney(order.amount)}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {dayjs(order.created_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="支付时间">
            {order.paid_at ? dayjs(order.paid_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="过期时间">
            {dayjs(order.expired_at).format('YYYY-MM-DD HH:mm:ss')}
          </Descriptions.Item>
          <Descriptions.Item label="备注">
            {order.notes || '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 用户信息 */}
      <Card title="用户信息">
        <Descriptions column={2} bordered size="small">
          <Descriptions.Item label="用户名">{order.user?.username}</Descriptions.Item>
          <Descriptions.Item label="手机号">{order.user?.phone}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{order.user?.email}</Descriptions.Item>
          <Descriptions.Item label="用户状态">
            <Tag color={order.user?.status === 1 ? 'green' : 'red'}>
              {order.user?.status === 1 ? '正常' : '禁用'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 订单进度 */}
      <Card title="订单进度">
        <Steps current={getOrderSteps().findIndex(step => step.status === 'process')}>
          {getOrderSteps().map((step, index) => (
            <Step
              key={index}
              title={step.title}
              status={step.status as any}
            />
          ))}
        </Steps>
      </Card>

      {/* 订单时间线 */}
      <Card title="操作记录">
        <Timeline>
          {mockTimeline.map((item) => (
            <Timeline.Item key={item.id}>
              <div className="space-y-1">
                <div className="font-medium">{item.description}</div>
                <div className="text-sm text-gray-500">
                  {dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')} | 操作人: {item.operator}
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>
    </div>
  );
}