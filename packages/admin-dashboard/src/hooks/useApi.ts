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
import { usePermissions } from '@/hooks/useAuth';
import { settingsApi } from '@/lib/api';
import { SystemSettings, PlanConfig } from '@/types';
import { PLAN_TYPES } from '@/lib/constants';
import { formatMoney } from '@/lib/utils';

const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;
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
      // const data = await settingsApi.getSettings();
      // setSettings(data);
      
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
      // await settingsApi.updateSettings({ [section]: values });
      setSettings(prev => ({ ...prev, [section]: values }));
      message.success('设置保存成功');
    } catch (error) {
      message.error('设置保存失败');
    }
  };

  // 套餐管理
  const handlePlanAction = (action: string, plan?: PlanConfig) => {
    if (!canWrite) {
      message.error('没有权限执行此操作');
      return;
    }

    if (action === 'create') {
      setSelectedPlan(null);
      planForm.resetFields();
      setPlanModalVisible(true);
    } else if (action === 'edit' && plan) {
      setSelectedPlan(plan);
      planForm.setFieldsValue(plan);
      setPlanModalVisible(true);
    } else if (action === 'delete' && plan) {
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除套餐 "${plan.name}" 吗？`,
        onOk: () => {
          const newPlans = settings.subscription.plans.filter(p => p.id !== plan.id);
          setSettings(prev => ({
            ...prev,
            subscription: { ...prev.subscription, plans: newPlans }
          }));
          message.success('套餐删除成功');
        },
      });
    }
  };

  // 保存套餐
  const handleSavePlan = async (values: any) => {
    try {
      if (selectedPlan) {
        // 编辑套餐
        const newPlans = settings.subscription.plans.map(p =>
          p.id === selectedPlan.id ? { ...p, ...values } : p
        );
        setSettings(prev => ({
          ...prev,
          subscription: { ...prev.subscription, plans: newPlans }
        }));
        message.success('套餐更新成功');
      } else {
        // 新增套餐
        const newPlan: PlanConfig = {
          id: Date.now(),
          ...values,
          features: values.features || [],
          is_active: true,
          sort_order: settings.subscription.plans.length + 1,
        };
        setSettings(prev => ({
          ...prev,
          subscription: {
            ...prev.subscription,
            plans: [...prev.subscription.plans, newPlan]
          }
        }));
        message.success('套餐创建成功');
      }
      setPlanModalVisible(false);
    } catch (error) {
      message.error('套餐保存失败');
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
      render: (_, record: PlanConfig) => (
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
      render: (_, record: PlanConfig) => (
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
    {
      title: '操作',
      key: 'action',
      render: (_, record: PlanConfig) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handlePlanAction('edit', record)}
            disabled={!canWrite}
          >
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handlePlanAction('delete', record)}
            disabled={!canWrite}
          >
            删除
          </Button>
        </Space>
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

                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="logo"
                      label="站点Logo"
                    >
                      <Upload
                        listType="picture-card"
                        showUploadList={false}
                        beforeUpload={() => false}
                      >
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8 }}>上传Logo</div>
                        </div>
                      </Upload>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="favicon"
                      label="网站图标"
                    >
                      <Upload
                        listType="picture-card"
                        showUploadList={false}
                        beforeUpload={() => false}
                      >
                        <div>
                          <UploadOutlined />
                          <div style={{ marginTop: 8 }}>上传图标</div>
                        </div>
                      </Upload>
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
              {/* 基础设置 */}
              <Card title="基础设置">
                <Form
                  form={subscriptionForm}
                  layout="vertical"
                  onFinish={(values) => handleSave('subscription', { ...settings.subscription, ...values })}
                >
                  <Row gutter={24}>
                    <Col span={8}>
                      <Form.Item
                        name="trial_days"
                        label="试用天数"
                        rules={[{ required: true, message: '请输入试用天数' }]}
                      >
                        <InputNumber
                          min={0}
                          max={365}
                          placeholder="试用天数"
                          style={{ width: '100%' }}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name="auto_renew_enabled"
                        label="自动续费"
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

              {/* 套餐管理 */}
              <Card
                title="套餐管理"
                extra={
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => handlePlanAction('create')}
                    disabled={!canWrite}
                  >
                    新增套餐
                  </Button>
                }
              >
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

                <Divider />

                <Title level={4}>金额限制</Title>
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="min_amount"
                      label="最低金额"
                      rules={[{ required: true, message: '请输入最低金额' }]}
                    >
                      <InputNumber
                        min={0.01}
                        precision={2}
                        placeholder="最低金额"
                        style={{ width: '100%' }}
                        formatter={(value) => `¥ ${value}`}
                        parser={(value) => value!.replace(/¥\s?|(,*)/g, '')}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="max_amount"
                      label="最高金额"
                      rules={[{ required: true, message: '请输入最高金额' }]}
                    >
                      <InputNumber
                        min={1}
                        precision={2}
                        placeholder="最高金额"
                        style={{ width: '100%' }}
                        formatter={(value) => `¥ ${value}`}
                        parser={(value) => value!.replace(/¥\s?|(,*)/g, '')}
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
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => paymentForm.setFieldsValue(settings.payment)}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>

          {/* 通知设置 */}
          <TabPane
            tab={
              <span>
                <BellOutlined />
                通知设置
              </span>
            }
            key="notification"
          >
            <Card>
              <Form
                form={notificationForm}
                layout="vertical"
                onFinish={(values) => handleSave('notification', values)}
              >
                <Title level={4}>通知方式</Title>
                <Row gutter={24}>
                  <Col span={8}>
                    <Form.Item
                      name="email_enabled"
                      label="邮件通知"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="sms_enabled"
                      label="短信通知"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                  <Col span={8}>
                    <Form.Item
                      name="webhook_enabled"
                      label="Webhook通知"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Divider />

                <Alert
                  message="通知模板配置"
                  description="您可以在这里配置各种通知的模板内容，支持变量替换功能。"
                  type="info"
                  showIcon
                  className="mb-4"
                />

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
                      onClick={() => notificationForm.setFieldsValue(settings.notification)}
                    >
                      重置
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

                <Divider />

                <Title level={4}>会话管理</Title>
                <Row gutter={24}>
                  <Col span={12}>
                    <Form.Item
                      name="session_timeout"
                      label="会话超时时间（秒）"
                      rules={[{ required: true, message: '请输入会话超时时间' }]}
                    >
                      <InputNumber
                        min={1800}
                        max={86400}
                        placeholder="会话超时时间"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="two_factor_enabled"
                      label="双因子认证"
                      valuePropName="checked"
                    >
                      <Switch />
                    </Form.Item>
                  </Col>
                </Row>

                <Alert
                  message="安全提示"
                  description="启用双因子认证可以大大提高账户的安全性，建议开启此功能。"
                  type="warning"
                  showIcon
                  className="mb-4"
                />

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
                      onClick={() => securityForm.setFieldsValue(settings.security)}
                    >
                      重置
                    </Button>
                  </Space>
                </Form.Item>
              </Form>
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* 套餐编辑模态框 */}
      <Modal
        title={selectedPlan ? '编辑套餐' : '新增套餐'}
        open={planModalVisible}
        onCancel={() => setPlanModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={planForm}
          layout="vertical"
          onFinish={handleSavePlan}
          className="mt-4"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label="套餐名称"
                rules={[{ required: true, message: '请输入套餐名称' }]}
              >
                <Input placeholder="请输入套餐名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="type"
                label="套餐类型"
                rules={[{ required: true, message: '请选择套餐类型' }]}
              >
                <Select placeholder="请选择套餐类型">
                  <Option value="monthly">月度套餐</Option>
                  <Option value="quarterly">季度套餐</Option>
                  <Option value="yearly">年度套餐</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="price"
                label="价格"
                rules={[{ required: true, message: '请输入价格' }]}
              >
                <InputNumber
                  min={0}
                  precision={2}
                  placeholder="请输入价格"
                  style={{ width: '100%' }}
                  formatter={(value) => `¥ ${value}`}
                  parser={(value) => value!.replace(/¥\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="original_price"
                label="原价"
              >
                <InputNumber
                  min={0}
                  precision={2}
                  placeholder="请输入原价"
                  style={{ width: '100%' }}
                  formatter={(value) => `¥ ${value}`}
                  parser={(value) => value!.replace(/¥\s?|(,*)/g, '')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="features"
            label="套餐特性"
            tooltip="每行一个特性，回车换行"
          >
            <TextArea
              rows={4}
              placeholder="请输入套餐特性，每行一个"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="is_popular"
                label="热门套餐"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="is_active"
                label="启用状态"
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button onClick={() => setPlanModalVisible(false)}>
              取消
            </Button>
            <Button type="primary" htmlType="submit">
              {selectedPlan ? '更新' : '创建'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}