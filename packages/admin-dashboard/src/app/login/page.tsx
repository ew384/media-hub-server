'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, Space, Alert, Checkbox } from 'antd';
import { UserOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { useAuthStore } from '@/stores/auth';

const { Title, Text } = Typography;

interface LoginForm {
  username: string;
  password: string;
  remember: boolean;
}

export default function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { login, isAuthenticated } = useAuthStore();

  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // 从localStorage恢复记住的用户名
  useEffect(() => {
    const rememberedUsername = localStorage.getItem('remembered_username');
    if (rememberedUsername) {
      form.setFieldsValue({
        username: rememberedUsername,
        remember: true,
      });
    }
  }, [form]);

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);
    setError(null);

    try {
      await login({
        username: values.username,
        password: values.password,
      });

      // 处理记住用户名
      if (values.remember) {
        localStorage.setItem('remembered_username', values.username);
      } else {
        localStorage.removeItem('remembered_username');
      }

      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = () => {
    if (error) {
      setError(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {/* Logo和标题 */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
            <UserOutlined className="text-white text-2xl" />
          </div>
          <Title level={2} className="!mb-2 !text-gray-800">
            自媒体管理后台
          </Title>
          <Text type="secondary" className="text-base">
            欢迎回来，请登录您的账户
          </Text>
        </div>

        {/* 登录表单 */}
        <Card className="shadow-xl border-0" bodyStyle={{ padding: '32px' }}>
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              className="mb-6 animate-slideInUp"
              closable
              onClose={() => setError(null)}
            />
          )}

          <Form
            form={form}
            name="login"
            size="large"
            onFinish={handleSubmit}
            onValuesChange={handleFormChange}
            autoComplete="off"
            className="animate-fadeIn"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少3个字符' },
                { max: 20, message: '用户名最多20个字符' },
              ]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="请输入用户名"
                autoComplete="username"
                className="!rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="请输入密码"
                autoComplete="current-password"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
                className="!rounded-lg"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked" className="!mb-6">
              <Checkbox className="text-gray-600">记住用户名</Checkbox>
            </Form.Item>

            <Form.Item className="!mb-4">
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                className="!h-12 !rounded-lg !text-base !font-medium"
              >
                {loading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>

          {/* 提示信息 */}
          <div className="text-center mt-6 pt-6 border-t border-gray-100">
            <Space direction="vertical" size="small">
              <Text type="secondary" className="text-sm">
                默认账户信息
              </Text>
              <div className="bg-gray-50 rounded-lg p-3 text-left">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>超级管理员: admin / 123456</div>
                  <div>普通管理员: manager / 123456</div>
                  <div>运营人员: operator / 123456</div>
                </div>
              </div>
            </Space>
          </div>
        </Card>

        {/* 底部信息 */}
        <div className="text-center mt-8">
          <Text type="secondary" className="text-sm">
            © 2024 自媒体管理后台. All rights reserved.
          </Text>
        </div>
      </div>
    </div>
  );
}