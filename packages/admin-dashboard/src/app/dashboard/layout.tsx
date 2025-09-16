'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Badge,
  Space,
  Typography,
  ConfigProvider,
  theme,
  Spin,
} from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  CrownOutlined,
  BarChartOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { useAuthStore, authUtils } from '@/stores/auth';
import { MenuItem } from '@/types';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

// 菜单配置
const menuItems: MenuItem[] = [
  {
    key: 'dashboard',
    label: '数据概览',
    icon: <DashboardOutlined />,
    path: '/dashboard',
  },
  {
    key: 'users',
    label: '用户管理',
    icon: <UserOutlined />,
    path: '/users',
    permission: 'users:read',
  },
  {
    key: 'orders',
    label: '订单管理',
    icon: <ShoppingCartOutlined />,
    path: '/orders',
    permission: 'orders:read',
  },
  {
    key: 'subscriptions',
    label: '订阅管理',
    icon: <CrownOutlined />,
    path: '/subscriptions',
    permission: 'subscriptions:read',
  },
  {
    key: 'analytics',
    label: '数据分析',
    icon: <BarChartOutlined />,
    path: '/analytics',
    permission: 'analytics:read',
  },
  {
    key: 'settings',
    label: '系统设置',
    icon: <SettingOutlined />,
    path: '/settings',
    permission: 'settings:read',
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();
  const pathname = usePathname();
  
  const { user, isAuthenticated, logout, initialize, checkPermission } = useAuthStore();

  // 初始化
  useEffect(() => {
    const init = async () => {
      await initialize();
      setLoading(false);
    };
    init();
  }, [initialize]);

  // 检查认证状态
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, loading, router]);

  // 恢复主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    const item = menuItems.find(item => item.key === key);
    if (item?.path) {
      router.push(item.path);
    }
  };

  // 处理用户下拉菜单
  const handleUserMenuClick = ({ key }: { key: string }) => {
    switch (key) {
      case 'profile':
        router.push('/profile');
        break;
      case 'logout':
        handleLogout();
        break;
    }
  };

  // 处理登出
  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // 切换主题
  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  // 过滤有权限的菜单项
  const getFilteredMenuItems = () => {
    return menuItems.filter(item => {
      if (!item.permission) return true;
      return checkPermission(item.permission);
    }).map(item => ({
      key: item.key,
      label: item.label,
      icon: item.icon,
    }));
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    const item = menuItems.find(item => item.path === pathname);
    return item ? [item.key] : [];
  };

  // 用户下拉菜单
  const userMenu = {
    items: [
      {
        key: 'profile',
        label: '个人设置',
        icon: <UserOutlined />,
      },
      {
        type: 'divider' as const,
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        danger: true,
      },
    ],
    onClick: handleUserMenuClick,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          colorSuccess: '#52c41a',
          colorWarning: '#faad14',
          colorError: '#ff4d4f',
          borderRadius: 6,
          wireframe: false,
        },
        components: {
          Layout: {
            siderBg: darkMode ? '#1f1f1f' : '#fff',
            headerBg: darkMode ? '#1f1f1f' : '#fff',
            bodyBg: darkMode ? '#141414' : '#f5f5f5',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: darkMode ? '#111b26' : '#e6f7ff',
            itemHoverBg: darkMode ? '#262626' : '#f5f5f5',
          },
        },
      }}
    >
      <Layout className="min-h-screen">
        {/* 侧边栏 */}
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={80}
          className="shadow-lg"
        >
          {/* Logo区域 */}
          <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
            {collapsed ? (
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <UserOutlined className="text-white text-lg" />
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <UserOutlined className="text-white text-lg" />
                </div>
                <span className="text-lg font-semibold text-gray-800 dark:text-white">
                  管理后台
                </span>
              </div>
            )}
          </div>

          {/* 菜单 */}
          <Menu
            mode="inline"
            selectedKeys={getSelectedKeys()}
            items={getFilteredMenuItems()}
            onClick={handleMenuClick}
            className="border-r-0 mt-2"
            inlineIndent={20}
          />
        </Sider>

        {/* 主内容区 */}
        <Layout>
          {/* 顶部导航 */}
          <Header className="flex items-center justify-between px-6 h-16 shadow-sm">
            <div className="flex items-center space-x-4">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="!flex !items-center !justify-center !w-8 !h-8"
              />
              <div className="text-gray-600 dark:text-gray-300">
                <Text className="text-sm">
                  当前时间: {new Date().toLocaleString('zh-CN')}
                </Text>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* 主题切换 */}
              <Button
                type="text"
                icon={darkMode ? <SunOutlined /> : <MoonOutlined />}
                onClick={toggleTheme}
                className="!flex !items-center !justify-center !w-8 !h-8"
                title={darkMode ? '切换到浅色模式' : '切换到深色模式'}
              />

              {/* 通知 */}
              <Badge count={5} size="small">
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  className="!flex !items-center !justify-center !w-8 !h-8"
                />
              </Badge>

              {/* 用户信息 */}
              <Dropdown menu={userMenu} placement="bottomRight" arrow>
                <div className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg px-3 py-2 transition-colors">
                  <Avatar
                    size={32}
                    src={user?.avatar}
                    icon={!user?.avatar && <UserOutlined />}
                    className="bg-blue-500"
                  />
                  <div className="flex flex-col items-start">
                    <Text className="text-sm font-medium text-gray-800 dark:text-white">
                      {user?.username || '管理员'}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role ? authUtils.getRoleDisplayName(user.role) : ''}
                    </Text>
                  </div>
                </div>
              </Dropdown>
            </div>
          </Header>

          {/* 页面内容 */}
          <Content className="m-6 min-h-[calc(100vh-88px)]">
            <div className="animate-fadeIn">
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </ConfigProvider>
  );
}