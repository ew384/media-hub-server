// packages/admin-dashboard/src/app/login/page.tsx - 添加调试版本
'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const router = useRouter();
  const { login, isAuthenticated } = useAuthStore();

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      console.log('🔐 提交登录:', values);
      await login(values);
      
      console.log('✅ 登录成功，检查认证状态...');
      console.log('认证状态:', isAuthenticated);
      
      message.success('登录成功！');
      
      // 短暂延迟确保状态更新
      setTimeout(() => {
        console.log('🔄 跳转到 dashboard...');
        router.push('/dashboard');
      }, 500);
      
    } catch (error: any) {
      console.error('❌ 登录错误:', error);
      console.error('错误详情:', {
        message: error.message,
        response: error.response,
        stack: error.stack
      });
      
      message.error(error.message || '登录失败，请检查用户名和密码');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full">
        <Card 
          title={
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                自媒体管理后台
              </h2>
              <p className="text-gray-600 text-sm mt-2">请使用管理员账号登录</p>
            </div>
          }
          className="shadow-lg"
        >
          {/* 开发环境提示 */}
          <Alert
            message="开发环境默认账号"
            description={
              <div>
                <p>用户名: <strong>admin</strong></p>
                <p>密码: <strong>password</strong></p>
                <p className="text-xs text-gray-500 mt-2">
                  打开浏览器控制台可查看详细登录日志
                </p>
              </div>
            }
            type="info"
            showIcon
            className="mb-6"
          />

          <Form
            form={form}
            name="login"
            onFinish={handleLogin}
            size="large"
            layout="vertical"
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2个字符' }
              ]}
            >
              <Input 
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[
                { required: true, message: '请输入密码' }
              ]}
            >
              <Input.Password 
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="请输入密码"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                block
                size="large"
              >
                登录
              </Button>
            </Form.Item>
          </Form>

          <div className="text-center text-xs text-gray-500 mt-4">
            <p>此系统仅供管理员使用</p>
          </div>
        </Card>
      </div>
    </div>
  );
}