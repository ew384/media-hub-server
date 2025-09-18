'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Button,
  message,
  Form,
  Row,
  Col,
  Typography,
  Steps,
  Space,
  Alert,
} from 'antd';
import {
  ArrowLeftOutlined,
  SaveOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { userApi } from '@/lib/api';
import { usePermissions } from '@/hooks/useAuth';
import UserForm from '@/components/forms/UserForm';

const { Title, Text } = Typography;
const { Step } = Steps;

export default function CreateUserPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const { checkPermission } = usePermissions();

  const canWrite = checkPermission('users:write');

  // 权限检查
  if (!canWrite) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Alert
          message="权限不足"
          description="您没有权限创建用户"
          type="warning"
          showIcon
          action={
            <Button onClick={() => router.back()}>
              返回
            </Button>
          }
        />
      </div>
    );
  }

  // 创建用户
  const handleCreateUser = async (values: any) => {
    setLoading(true);
    try {
      // 处理表单数据
      const userData = {
        ...values,
        birthday: values.birthday?.format('YYYY-MM-DD'),
        status: values.status ? 1 : 0,
      };

      // await userApi.createUser(userData);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('用户创建成功');
      setCurrentStep(2); // 显示成功步骤
      
      // 2秒后跳转到用户列表
      setTimeout(() => {
        router.push('/users');
      }, 2000);
    } catch (error: any) {
      message.error(error.message || '用户创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 表单验证
  const handleFormValidation = async () => {
    try {
      await form.validateFields();
      setCurrentStep(1);
    } catch (error) {
      message.error('请完善表单信息');
    }
  };

  // 步骤配置
  const steps = [
    {
      title: '填写信息',
      description: '填写用户基本信息',
      icon: <UserOutlined />,
    },
    {
      title: '确认信息',
      description: '确认用户信息无误',
      icon: <CheckCircleOutlined />,
    },
    {
      title: '创建完成',
      description: '用户创建成功',
      icon: <CheckCircleOutlined />,
    },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Card title="用户基本信息" className="mt-6">
            <UserForm
              form={form}
              isEdit={false}
              loading={loading}
            />
            <div className="flex justify-end mt-6 pt-4 border-t">
              <Space>
                <Button onClick={() => router.back()}>
                  取消
                </Button>
                <Button type="primary" onClick={handleFormValidation}>
                  下一步
                </Button>
              </Space>
            </div>
          </Card>
        );

      case 1:
        const formValues = form.getFieldsValue();
        return (
          <Card title="确认用户信息" className="mt-6">
            <div className="space-y-4">
              <Alert
                message="请确认以下用户信息"
                description="确认无误后点击创建按钮"
                type="info"
                showIcon
              />
              
              <Row gutter={[24, 16]}>
                <Col span={12}>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center">
                      <UserOutlined className="mr-2" />
                      基本信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>用户名: <span className="font-medium">{formValues.username}</span></div>
                      <div>昵称: <span className="font-medium">{formValues.nickname || '-'}</span></div>
                      <div>性别: <span className="font-medium">
                        {formValues.gender === 'male' ? '男' : 
                         formValues.gender === 'female' ? '女' : '保密'}
                      </span></div>
                      <div>生日: <span className="font-medium">{formValues.birthday?.format('YYYY-MM-DD') || '-'}</span></div>
                      <div>地区: <span className="font-medium">{formValues.region || '-'}</span></div>
                    </div>
                  </div>
                </Col>
                
                <Col span={12}>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-medium mb-3 flex items-center">
                      <MailOutlined className="mr-2" />
                      联系信息
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div>手机号: <span className="font-medium">{formValues.phone}</span></div>
                      <div>邮箱: <span className="font-medium">{formValues.email}</span></div>
                      <div>状态: <span className="font-medium text-green-600">
                        {formValues.status !== false ? '启用' : '禁用'}
                      </span></div>
                    </div>
                  </div>
                </Col>
              </Row>

              {formValues.bio && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">个人简介</h4>
                  <p className="text-sm text-gray-600">{formValues.bio}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6 pt-4 border-t">
              <Space>
                <Button onClick={() => setCurrentStep(0)}>
                  上一步
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={loading}
                  onClick={() => handleCreateUser(formValues)}
                >
                  创建用户
                </Button>
              </Space>
            </div>
          </Card>
        );

      case 2:
        return (
          <Card className="mt-6">
            <div className="text-center py-8">
              <CheckCircleOutlined 
                style={{ fontSize: 64, color: '#52c41a' }} 
                className="mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">用户创建成功！</h3>
              <p className="text-gray-600 mb-6">
                用户 <span className="font-medium">{form.getFieldValue('username')}</span> 已成功创建
              </p>
              <div className="text-sm text-gray-500">
                即将自动跳转到用户列表页面...
              </div>
            </div>
          </Card>
        );

      default:
        return null;
    }
  };

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
            <Title level={2} className="!mb-2">
              创建用户
            </Title>
            <Text type="secondary">
              添加新用户到系统中
            </Text>
          </div>
        </div>
      </div>

      {/* 步骤指示器 */}
      <Card>
        <Steps 
          current={currentStep} 
          items={steps}
          className="mb-4"
        />
      </Card>

      {/* 步骤内容 */}
      {renderStepContent()}
    </div>
  );
}