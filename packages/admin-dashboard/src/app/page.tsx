'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, initialize } = useAuthStore();

  useEffect(() => {
    const handleRedirect = async () => {
      // 初始化认证状态
      await initialize();
      
      // 根据认证状态进行重定向
      if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    };

    handleRedirect();
  }, [isAuthenticated, router, initialize]);

  // 显示加载状态
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Spin size="large" />
        <div className="mt-4 text-gray-600">
          正在加载系统...
        </div>
      </div>
    </div>
  );
}