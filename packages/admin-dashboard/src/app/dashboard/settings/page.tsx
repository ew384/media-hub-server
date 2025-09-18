// 创建 src/app/dashboard/settings/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Form,
  Input,
  InputNumber,
  Switch,
  Button,
  Upload,
  message,
  Row,
  Col,
  Divider,
  Typography,
  Space,
  Select,
  Table,
  Modal,
  Tag,
  Alert,
} from 'antd';
import {
  UploadOutlined,
  SaveOutlined,
  ReloadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  BellOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import { usePermissions } from '@/stores/auth';
import { settingsApi } from '@/lib/api';
import { SystemSettings, PlanConfig } from '@/types';
import { formatMoney } from '@/lib/utils';

const { TabPane } = Tabs;
const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('site');
  const [planModalVisible, setPlanModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);

  const [siteForm] = Form.useForm();
  const [subscriptionForm] = Form.useForm();
  const [paymentForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [securityForm] = Form.useForm();
  const [planForm] = Form.useForm();

  const { checkPermission } = usePermissions();
  const canWrite = checkPermission('settings:write');
  const canRead = checkPermission('settings:read');

  // 模拟数据
  const [settings, setSettings] = useState<SystemSettings>({
    site: {
      name: '自媒体管理后台',
      description: '专业的自媒体多账号管理系统',
      logo: '',
      favicon: '',
    },
    subscription: {
      plans: [
        {
          id: 1,
          name: '基础版',
          type: 'monthly',
          price: 99,
          original_price: 99,
          features: ['5个账号', '基础功能', '邮件支持'],
          is_popular: false,
          is_active: true,
          sort_order: 1,
        },
        {
          id: 2,
          name: '专业版',
          type: 'quarterly',
          price: 279,
          original_price: 297,
          features: ['15个账号', '高级功能', '优先支持'],
          is_popular: true,
          is_active: true,
          sort_order: 2,
        },
        {
          id: 3,
          name: '企业版',
          type: 'yearly',
          price: 999,
          original_price: 1188,
          features: ['无限账号', '全部功能', '专属客服'],
          is_popular: false,
          is_active: true,
          sort_order: 3,
        },
      ],
      trial_days: 7,
      auto_renew_enabled: true,
    },
    payment: {
      alipay_enabled: true,
      wechat_enabled: true,
      min_amount: 1,
      max_amount: 10000,
    },
    notification: {
      email_enabled: true,
      sms_enabled: false,
      webhook_enabled: true,
      templates: [],
    },
    security: {
      password_min_length: 8,
      login_max_attempts: 5,
      session_timeout: 7200,
      two_factor_enabled: false,
    },
  });

  // 获取设置数据
  const fetchSettings = async () => {
    if (!canRead) return;

    setLoading(true);
    try {
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 填充表单
      siteForm.setFieldsValue(settings.site);
      subscriptionForm.setFieldsValue(settings.subscription);
      paymentForm.setFieldsValue(settings.payment);
      notificationForm.setFieldsValue(settings.notification);
      securityForm.setFieldsValue(settings.security);
    } catch (error) {
      message.error('获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // 保存设置
  const handleSave = async (section: string, values: any) => {
    if (!canWrite) {
      message.error('没有权限修改设置');
      return;
    }

    try {
      setSettings(prev => ({ ...prev, [section]: values }));
      message.success('设置保存成功');
    } catch (error) {
      message.error('设置保存失败');
    }
  };

  // 套餐表格列
  const planColumns = [
    {
      title: '套餐名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => {
        const typeMap = {
          monthly: '月度',
          quarterly: '季度',
          yearly: '年度',
        };
        return typeMap[type as keyof typeof typeMap] || type;
      },
    },
    {
      title: '价格',
      key: 'price',
      render: (_: any, record: PlanConfig) => (
        <div>
          <div className="font-medium">{formatMoney(record.price)}</div>
          {record.original_price > record.price && (
            <div className="text-sm text-gray-500 line-through">
              {formatMoney(record.original_price)}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '特性',
      dataIndex: 'features',
      key: 'features',
      render: (features: string[]) => (
        <div className="space-y-1">
          {features.map((feature, index) => (
            <Tag key={index} color="blue" className="text-xs">
              {feature}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (_: any, record: PlanConfig) => (
        <div className="space-y-1">
          <div>
            <Tag color={record.is_active ? 'green' : 'red'}>
              {record.is_active ? '启用' : '禁用'}
            </Tag>
          </div>
          {record.is_popular && (
            <Tag color="orange">热门</Tag>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <Title level={2} className="!mb-2">
          系统设置
        </Title>
        <Text type="secondary">
          管理系统配置、套餐设置和安全策略
        </Text>
      </div>

      {/* 设置标签页 */}
      <Card className="card-shadow">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="large"
        >
          {/* 站点设置 */}
          <TabPane
            tab={
              <span>
                <SettingOutlined />
                站点设置
              </span>
            }
            key="site"
          >
            <Card>
              <Form
                form={siteForm}
                layout="vertical"
                onFinish={(values) => handleSave('site', values)}
              >
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="name"
                      label="站点名称"
                      rules={[{ required: true, message: '请输入站点名称' }]}
                    >
                      <Input placeholder="请输入站点名称" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="description"
                      label="站点描述"
                    >
                      <Input placeholder="请输入站点描述" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      disabled={!canWrite}
                    >
                      保存设置
                    </Button>
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => siteForm.setFieldsValue(settings.site)}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          {/* 订阅设置 */}
          <TabPane
            tab={
              <span>
                <DollarOutlined />
                订阅设置
              </span>
            }
            key="subscription"
          >
            <div className="space-y-6">
              {/* 套餐管理 */}
              <Card title="套餐管理">
                <Table
                  columns={planColumns}
                  dataSource={settings.subscription.plans}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                />
              </Card>
            </div>
          </TabPane>

          {/* 支付设置 */}
          <TabPane
            tab={
              <span>
                <DollarOutlined />
                支付设置
              </span>
            }
            key="payment"
          >
            <Card>
              <Form
                form={paymentForm}
                layout="vertical"
                onFinish={(values) => handleSave('payment', values)}
              >
                <Title level={4}>支付方式</Title>
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="alipay_enabled"
                      label="支付宝"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="wechat_enabled"
                      label="微信支付"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      disabled={!canWrite}
                    >
                      保存设置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          {/* 安全设置 */}
          <TabPane
            tab={
              <span>
                <SecurityScanOutlined />
                安全设置
              </span>
            }
            key="security"
          >
            <Card>
              <Alert
                message="安全提示"
                description="这些设置将影响系统的安全性，请谨慎配置。"
                type="warning"
                showIcon
                className="mb-4"
              />
              
              <Form
                form={securityForm}
                layout="vertical"
                onFinish={(values) => handleSave('security', values)}
              >
                <Title level={4}>密码策略</Title>
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="password_min_length"
                      label="密码最小长度"
                      rules={[{ required: true, message: '请输入密码最小长度' }]}
                    >
                      <InputNumber
                        min={6}
                        max={32}
                        placeholder="密码最小长度"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="login_max_attempts"
                      label="登录失败次数限制"
                      rules={[{ required: true, message: '请输入登录失败次数限制' }]}
                    >
                      <InputNumber
                        min={3}
                        max={10}
                        placeholder="登录失败次数限制"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item>
                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      disabled={!canWrite}
                    >
                      保存设置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
}