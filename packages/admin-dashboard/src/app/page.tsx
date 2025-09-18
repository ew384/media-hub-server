'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spin } from 'antd';
import { useAuthStore } from '@/stores/auth';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isInitialized, initialize } = useAuthStore();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    const handleRedirect = async () => {
      console.log('🏠 HomePage: 开始处理重定向...', {
        isInitialized,
        isAuthenticated,
        isRedirecting
      });

      // 如果已经在重定向过程中，避免重复处理
      if (isRedirecting) {
        console.log('⏭️ HomePage: 已在重定向中，跳过');
        return;
      }

      // 如果还未初始化，先初始化
      if (!isInitialized) {
        console.log('🚀 HomePage: 开始初始化认证状态...');
        try {
          await initialize();
        } catch (error) {
          console.error('❌ HomePage: 初始化失败:', error);
        }
        return; // 等待下次 effect 触发
      }

      // 初始化完成后进行重定向
      console.log('➡️ HomePage: 执行重定向', { isAuthenticated });
      setIsRedirecting(true);
      
      try {
        if (isAuthenticated) {
          console.log('✅ HomePage: 已认证，跳转到 dashboard');
          router.replace('/dashboard');
        } else {
          console.log('🔒 HomePage: 未认证，跳转到 login');
          router.replace('/login');
        }
      } catch (error) {
        console.error('❌ HomePage: 重定向失败:', error);
        setIsRedirecting(false);
      }
    };

    handleRedirect();
  }, [isInitialized, isAuthenticated, router, isRedirecting, initialize]);

  // 显示加载状态
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl font-bold">M</span>
          </div>
        </div>
        <Spin size="large" />
        <div className="mt-4 text-gray-600">
          {!isInitialized ? '正在初始化系统...' : 
           isRedirecting ? '正在跳转...' : 
           '正在加载...'}
        </div>
        <div className="mt-2 text-sm text-gray-400">
          自媒体管理后台
        </div>
      </div>
    </div>
  );
}