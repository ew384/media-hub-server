'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore } from '@/stores/auth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, initialize } = useAuthStore();

  // 初始化认证状态
  useEffect(() => {
    initialize();
  }, [initialize]);

  // 如果已登录，重定向到仪表板
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          borderRadius: 6,
          wireframe: false,
        },
        components: {
          Button: {
            borderRadius: 6,
            controlHeight: 40,
          },
          Input: {
            borderRadius: 6,
            controlHeight: 40,
          },
          Card: {
            borderRadiusLG: 8,
          },
        },
      }}
    >
      {children}
    </ConfigProvider>
  );
}