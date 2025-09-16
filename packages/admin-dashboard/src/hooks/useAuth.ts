import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { AdminUser } from '@/types';

// 认证状态Hook
export const useAuth = () => {
  const {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    initialize,
  } = useAuthStore();

  return {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    initialize,
  };
};

// 需要认证的页面Hook
export const useRequireAuth = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      await initialize();
      
      if (!isLoading && !isAuthenticated) {
        router.replace('/login');
      }
    };

    checkAuth();
  }, [isAuthenticated, isLoading, router, initialize]);

  return { isAuthenticated, isLoading };
};

// 已登录用户重定向Hook
export const useRedirectIfAuthenticated = () => {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    const checkAuth = async () => {
      await initialize();
      
      if (!isLoading && isAuthenticated) {
        router.replace('/dashboard');
      }
    };

    checkAuth();
  }, [isAuthenticated, isLoading, router, initialize]);

  return { isAuthenticated, isLoading };
};

// 权限检查Hook
export const usePermissions = () => {
  const { user } = useAuthStore();

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false;
    
    // 超级管理员拥有所有权限
    if (user.permissions.includes('*')) return true;
    
    // 检查特定权限
    return user.permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const requirePermission = (permission: string): void => {
    if (!hasPermission(permission)) {
      throw new Error(`Insufficient permissions: ${permission}`);
    }
  };

  const requireAnyPermission = (permissions: string[]): void => {
    if (!hasAnyPermission(permissions)) {
      throw new Error(`Insufficient permissions: ${permissions.join(' or ')}`);
    }
  };

  return {
    hasPermission,
    hasAnyPermission,
    requirePermission,
    requireAnyPermission,
  };
};

// 用户信息Hook
export const useCurrentUser = (): AdminUser | null => {
  const { user } = useAuthStore();
  return user;
};

// 登录Hook
export const useLogin = () => {
  const { login, isLoading } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (credentials: { username: string; password: string }) => {
    try {
      await login(credentials);
      router.replace('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  return {
    login: handleLogin,
    isLoading,
  };
};

// 登出Hook
export const useLogout = () => {
  const { logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // 即使登出失败也要跳转到登录页
      router.replace('/login');
    }
  };

  return {
    logout: handleLogout,
  };
};