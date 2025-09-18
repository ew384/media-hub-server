'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Steps,
  Timeline,
  Tag,
  Modal,
  Form,
  InputNumber,
  Input,
  message,
  Spin,
  Alert,
  Row,
  Col,
  Statistic,
  Divider,
} from 'antd';
import {
  ArrowLeftOutlined,
  DollarOutlined,
  UserOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { orderApi } from '@/lib/api';
import { OrderInfo, OrderTimeline, PaymentInfo } from '@/types';
import { usePermissions } from '@/hooks/useAuth';
import { formatMoney, formatDateTime } from '@/lib/utils';
import dayjs from 'dayjs';

const { Step } = Steps;
const { TextArea } = Input;

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderNo = params.orderNo as string;
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [timeline, setTimeline] = useState<OrderTimeline[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [noteModalVisible, setNoteModalVisible] = useState(false);

  const [refundForm] = Form.useForm();
  const [noteForm] = Form.useForm();
  const { checkPermission } = usePermissions();
  const canWrite = checkPermission('orders:write');

  // 获取订单详情
  const fetchOrderDetail = async () => {
    setLoading(true);
    try {
      // const orderData = await orderApi.getOrderDetail(orderNo);
      // const timelineData = await orderApi.getTimeline(orderNo);
      // setOrder(orderData);
      // setTimeline(timelineData);
      
      // 模拟数据
      const mockOrder: OrderInfo = {
        id: 1,
        order_no: orderNo,
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
      };

      const mockTimeline: OrderTimeline[] = [
        {
          id: 1,
          order_no: orderNo,
          event: 'order_created',
          description: '订单创建',
          operator: '系统',
          created_at: mockOrder.created_at,
        },
        {
          id: 2,
          order_no: orderNo,
          event: 'payment_success',
          description: '支付成功',
          operator: '系统',
          created_at: mockOrder.paid_at || mockOrder.created_at,
        },
      ];

      const mockPaymentInfo: PaymentInfo = {
        payment_id: 'PAY' + Date.now(),
        order_no: orderNo,
        amount: mockOrder.amount,
        payment_method: mockOrder.payment_method,
        transaction_id: 'TXN' + Date.now(),
        payment_time: mockOrder.paid_at,
        callback_data: {},
      };

      setOrder(mockOrder);
      setTimeline(mockTimeline);
      setPaymentInfo(mockPaymentInfo);
    } catch (error) {
      message.error('获取订单详情失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNo) {
      fetchOrderDetail();
    }
  }, [orderNo]);

  // 获取订单状态配置
  const getOrderStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; text: string; icon: React.ReactNode }> = {
      pending: { color: 'orange', text: '待支付', icon: <ClockCircleOutlined /> },
      paid: { color: 'green', text: '已支付', icon: <CheckCircleOutlined /> },
      cancelled: { color: 'red', text: '已取消', icon: <CloseCircleOutlined /> },
      refunded: { color: 'purple', text: '已退款', icon: <UndoOutlined /> },
      expired: { color: 'gray', text: '已过期', icon: <ExclamationCircleOutlined /> },
    };
    return configs[status] || { color: 'default', text: status, icon: null };
  };

  // 获取订单步骤
  const getOrderSteps = () => {
    if (!order) return [];

    const steps = [
      { title: '订单创建', status: 'finish', description: formatDateTime(order.created_at) },
      { title: '等待支付', status: 'wait', description: '' },
      { title: '支付完成', status: 'wait', description: '' },
    ];

    switch (order.status) {
      case 'pending':
        steps[1].status = 'process';
        break;
      case 'paid':
        steps[1].status = 'finish';
        steps[1].description = formatDateTime(order.paid_at || '');
        steps[2].status = 'finish';
        steps[2].description = formatDateTime(order.paid_at || '');
        break;
      case 'cancelled':
        steps[1].status = 'error';
        steps[1].description = '订单已取消';
        break;
      case 'expired':
        steps[1].status = 'error';
        steps[1].description = '订单已过期';
        break;
      case 'refunded':
        steps[1].status = 'finish';
        steps[2].status = 'finish';
        steps.push({ title: '已退款', status: 'finish', description: '' });
        break;
    }

    return steps;
  };

  // 申请退款
  const handleRefund = async (values: any) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    try {
      // await orderApi.refundOrder(orderNo, values);
      message.success('退款申请提交成功');
      setRefundModalVisible(false);
      fetchOrderDetail();
    } catch (error) {
      message.error('退款申请失败');
    }
  };

  // 取消订单
  const handleCancel = () => {
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
          fetchOrderDetail();
        } catch (error) {
          message.error('订单取消失败');
        }
      },
    });
  };

  // 确认订单
  const handleConfirm = () => {
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
          fetchOrderDetail();
        } catch (error) {
          message.error('订单确认失败');
        }
      },
    });
  };

  // 添加备注
  const handleAddNote = async (values: any) => {
    try {
      // await orderApi.addNote(orderNo, values.note);
      message.success('备注添加成功');
      setNoteModalVisible(false);
      fetchOrderDetail();
    } catch (error) {
      message.error('备注添加失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <Alert
        message="订单不存在"
        description="未找到指定的订单信息"
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

  const statusConfig = getOrderStatusConfig(order.status);

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
          <div>
            <h1 className="text-2xl font-bold">订单详情</h1>
            <div className="flex items-center space-x-2 mt-1">
              <span className="text-gray-500">订单号:</span>
              <span className="font-mono">{orderNo}</span>
              <Tag color={statusConfig.color} icon={statusConfig.icon}>
                {statusConfig.text}
              </Tag>
            </div>
          </div>
        </div>
        <Space>
          {canWrite && order.status === 'pending' && (
            <>
              <Button onClick={handleConfirm}>
                确认订单
              </Button>
              <Button danger onClick={handleCancel}>
                取消订单
              </Button>
            </>
          )}
          {canWrite && order.status === 'paid' && (
            <Button 
              icon={<UndoOutlined />}
              onClick={() => setRefundModalVisible(true)}
            >
              申请退款
            </Button>
          )}
          <Button 
            icon={<EditOutlined />}
            onClick={() => setNoteModalVisible(true)}
          >
            添加备注
          </Button>
        </Space>
      </div>

      {/* 订单进度 */}
      <Card title="订单进度">
        <Steps current={getOrderSteps().findIndex(step => step.status === 'process')}>
          {getOrderSteps().map((step, index) => (
            <Step
              key={index}
              title={step.title}
              status={step.status as any}
              description={step.description}
            />
          ))}
        </Steps>
      </Card>

      {/* 订单信息 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="订单信息">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="订单号">{order.order_no}</Descriptions.Item>
              <Descriptions.Item label="订单状态">
                <Tag color={statusConfig.color} icon={statusConfig.icon}>
                  {statusConfig.text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="套餐类型">
                {order.plan_type === 'monthly' ? '月度套餐' : 
                 order.plan_type === 'quarterly' ? '季度套餐' : '年度套餐'}
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {order.payment_method === 'alipay' ? '支付宝' : '微信支付'}
              </Descriptions.Item>
              <Descriptions.Item label="创建时间">
                {formatDateTime(order.created_at)}
              </Descriptions.Item>
              <Descriptions.Item label="支付时间">
                {order.paid_at ? formatDateTime(order.paid_at) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="过期时间">
                {formatDateTime(order.expired_at)}
              </Descriptions.Item>
              <Descriptions.Item label="备注">
                {order.notes || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="金额信息">
            <div className="space-y-4">
              <Row>
                <Col span={12}>
                  <Statistic
                    title="原价"
                    value={order.original_amount}
                    formatter={(value) => formatMoney(Number(value))}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="优惠金额"
                    value={order.discount_amount}
                    formatter={(value) => formatMoney(Number(value))}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Col>
              </Row>
              <Divider />
              <Statistic
                title="实付金额"
                value={order.amount}
                formatter={(value) => formatMoney(Number(value))}
                valueStyle={{ color: '#1890ff', fontSize: '24px' }}
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 用户信息 */}
      <Card title="用户信息">
        <Descriptions column={2} size="small">
          <Descriptions.Item label="用户名">{order.user?.username}</Descriptions.Item>
          <Descriptions.Item label="手机号">{order.user?.phone}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{order.user?.email}</Descriptions.Item>
          <Descriptions.Item label="用户状态">
            <Tag color={order.user?.status === 1 ? 'green' : 'red'}>
              {order.user?.status === 1 ? '正常' : '禁用'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
        <div className="mt-4">
          <Button 
            type="link" 
            icon={<UserOutlined />}
            onClick={() => router.push(`/users/${order.user_id}`)}
          >
            查看用户详情
          </Button>
        </div>
      </Card>

      {/* 支付信息 */}
      {paymentInfo && (
        <Card title="支付信息">
          <Descriptions column={2} size="small">
            <Descriptions.Item label="支付ID">{paymentInfo.payment_id}</Descriptions.Item>
            <Descriptions.Item label="交易号">{paymentInfo.transaction_id}</Descriptions.Item>
            <Descriptions.Item label="支付金额">
              {formatMoney(paymentInfo.amount)}
            </Descriptions.Item>
            <Descriptions.Item label="支付时间">
              {paymentInfo.payment_time ? formatDateTime(paymentInfo.payment_time) : '-'}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* 操作记录 */}
      <Card title="操作记录">
        <Timeline>
          {timeline.map((item) => (
            <Timeline.Item key={item.id}>
              <div>
                <div className="font-medium">{item.description}</div>
                <div className="text-sm text-gray-500">
                  {formatDateTime(item.created_at)} | 操作人: {item.operator}
                </div>
              </div>
            </Timeline.Item>
          ))}
        </Timeline>
      </Card>

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
          onFinish={handleRefund}
          className="mt-4"
        >
          <Form.Item
            name="amount"
            label="退款金额"
            rules={[
              { required: true, message: '请输入退款金额' },
              { type: 'number', min: 0.01, message: '退款金额必须大于0' },
            ]}
            initialValue={order.amount}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0.01}
              max={order.amount}
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

      {/* 备注模态框 */}
      <Modal
        title="添加备注"
        open={noteModalVisible}
        onCancel={() => setNoteModalVisible(false)}
        footer={null}
      >
        <Form
          form={noteForm}
          layout="vertical"
          onFinish={handleAddNote}
          className="mt-4"
        >
          <Form.Item
            name="note"
            label="备注内容"
            rules={[{ required: true, message: '请输入备注内容' }]}
          >
            <TextArea
              rows={4}
              placeholder="请输入备注内容"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button onClick={() => setNoteModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              确认添加
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}