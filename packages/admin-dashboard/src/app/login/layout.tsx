// 解决方案1: 修复 login/layout.tsx - 移除自动重定向
// packages/admin-dashboard/src/app/login/layout.tsx

'use client';

import React from 'react';
import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 移除所有认证检查和重定向逻辑，让登录页面简单显示
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