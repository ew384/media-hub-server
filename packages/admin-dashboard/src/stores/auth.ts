// 修复版本：完整的认证状态管理
// packages/admin-dashboard/src/stores/auth.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminUser, AdminRole } from '@/types';
import { USER_ROLES, ROLE_PERMISSIONS, PERMISSIONS } from '@/lib/constants';
import { authApi } from '@/lib/api';

interface AuthState {
  // 状态
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // 操作方法
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AdminUser>) => Promise<void>;
  changePassword: (data: { oldPassword: string; newPassword: string }) => Promise<void>;
  initialize: () => Promise<void>;
  
  // 内部方法
  setUser: (user: AdminUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
}

let isInitializing = false;

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,
      isInitialized: false,

      // 登录
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          console.log('🔐 AuthStore: 开始登录:', credentials.username);
          const response = await authApi.login(credentials);
          console.log('✅ AuthStore: 登录响应:', response);
          
          // 适配后端响应格式
          const user = response.user || response;
          const accessToken = response.accessToken || response.token;
          
          if (!accessToken) {
            throw new Error('登录响应中缺少访问令牌');
          }
          
          // 确保用户有基本的权限信息
          const userRole = user.role || USER_ROLES.ADMIN;
          const userWithPermissions = {
            ...user,
            role: userRole,
            permissions: user.permissions || [...(ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || ['*'])]
          };
          
          console.log('💾 AuthStore: 保存认证状态', userWithPermissions);
          
          set({
            user: userWithPermissions,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });

          // 保存到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_token', accessToken);
            localStorage.setItem('admin_user', JSON.stringify(userWithPermissions));
            console.log('💾 AuthStore: 已保存到 localStorage');
          }
        } catch (error) {
          console.error('❌ AuthStore: 登录失败:', error);
          set({ 
            isLoading: false,
            isAuthenticated: false,
            isInitialized: true,
          });
          throw error;
        }
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('AuthStore: Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true,
          });

          // 清除localStorage
          if (typeof window !== 'undefined') {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
          }
        }
      },

      // 更新个人资料
      updateProfile: async (data) => {
        const currentUser = get().user;
        if (!currentUser) return;

        try {
          const updatedUser = await authApi.updateProfile(data);
          const newUser = { ...currentUser, ...updatedUser };
          set({ user: newUser });
          
          // 更新localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_user', JSON.stringify(newUser));
          }
        } catch (error) {
          throw error;
        }
      },

      // 修改密码
      changePassword: async (data) => {
        try {
          await authApi.changePassword(data);
        } catch (error) {
          throw error;
        }
      },

      // 初始化认证状态
      initialize: async () => {
        const { isInitialized } = get();
        if (isInitialized || isInitializing) {
          console.log('⏭️ AuthStore: 已初始化或正在初始化，跳过');
          return;
        }
        
        isInitializing = true;
        console.log('🚀 AuthStore: 开始初始化认证状态...');
        
        if (typeof window === 'undefined') {
          console.log('⏭️ AuthStore: 非浏览器环境，跳过初始化');
          set({ isInitialized: true });
          isInitializing = false;
          return;
        }

        try {
          const token = localStorage.getItem('admin_token');
          const userStr = localStorage.getItem('admin_user');

          console.log('💾 AuthStore: 从 localStorage 读取:', { hasToken: !!token, hasUser: !!userStr });

          if (token && userStr) {
            try {
              const user = JSON.parse(userStr);
              
              // 确保用户有权限信息
              const userRole = user.role || USER_ROLES.ADMIN;
              const userWithPermissions = {
                ...user,
                permissions: user.permissions || [...(ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS] || ['*'])]
              };
              
              console.log('✅ AuthStore: 恢复用户状态:', userWithPermissions);
              
              set({
                user: userWithPermissions,
                token,
                isAuthenticated: true,
                isInitialized: true,
              });

              console.log('✅ AuthStore: 认证状态已恢复');
              
            } catch (parseError) {
              console.error('❌ AuthStore: 解析用户数据失败:', parseError);
              localStorage.removeItem('admin_token');
              localStorage.removeItem('admin_user');
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isInitialized: true,
              });
            }
          } else {
            console.log('⚠️ AuthStore: 没有找到本地认证数据');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isInitialized: true,
            });
          }
        } catch (error) {
          console.error('❌ AuthStore: 初始化失败:', error);
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isInitialized: true,
          });
        } finally {
          isInitializing = false;
        }
      },

      // 内部方法
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
      setLoading: (loading) => set({ isLoading: loading }),
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// 修复后的权限Hook - 确保函数正确实现
export const usePermissions = () => {
  const user = useAuthStore(state => state.user);

  const checkPermission = (permission: string): boolean => {
    console.log('🔍 权限检查:', { permission, user: user?.username, userPermissions: user?.permissions });
    
    if (!user || !user.permissions) {
      console.log('❌ 权限检查失败: 用户未登录或无权限信息');
      return false;
    }
    
    // 超级管理员拥有所有权限
    if (user.permissions.includes('*') || user.permissions.includes(PERMISSIONS.ALL)) {
      console.log('✅ 权限检查通过: 超级管理员权限');
      return true;
    }
    
    // 检查特定权限
    const hasPermission = user.permissions.includes(permission);
    console.log(`${hasPermission ? '✅' : '❌'} 权限检查结果:`, permission, hasPermission);
    return hasPermission;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(permission => checkPermission(permission));
  };

  const requirePermission = (permission: string): void => {
    if (!checkPermission(permission)) {
      throw new Error(`Insufficient permissions: ${permission}`);
    }
  };

  const requireAnyPermission = (permissions: string[]): void => {
    if (!hasAnyPermission(permissions)) {
      throw new Error(`Insufficient permissions: ${permissions.join(' or ')}`);
    }
  };

  return {
    checkPermission,
    hasAnyPermission,
    requirePermission,
    requireAnyPermission,
  };
};

// 工具函数保持不变
export const authUtils = {
  getRoleDisplayName: (role: any): string => {
    const roleMap: Record<string, string> = {
      [USER_ROLES.SUPER_ADMIN]: '超级管理员',
      [USER_ROLES.ADMIN]: '管理员',
      [USER_ROLES.OPERATOR]: '运营',
      [USER_ROLES.VIEWER]: '查看者',
    };
    return roleMap[role] || '管理员';
  },
  
  getRoleColor: (role: any): string => {
    const colorMap: Record<string, string> = {
      [USER_ROLES.SUPER_ADMIN]: 'red',
      [USER_ROLES.ADMIN]: 'blue',
      [USER_ROLES.OPERATOR]: 'green',
      [USER_ROLES.VIEWER]: 'gray',
    };
    return colorMap[role] || 'blue';
  },
  
  isHighPrivilegeRole: (role: any): boolean => {
    return [USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN].includes(role);
  },
  
  getRolePermissions: (role: any): string[] => {
    return [...(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [])];
  },
  
  formatPermissions: (permissions: string[]): string[] => {
    if (permissions.includes('*')) return ['所有权限'];
    return permissions.map(permission => {
      const permissionMap: Record<string, string> = {
        'users:read': '用户查看',
        'users:write': '用户管理',
        'orders:read': '订单查看',
        'orders:write': '订单管理',
        'subscriptions:read': '订阅查看',
        'subscriptions:write': '订阅管理',
        'analytics:read': '数据分析',
        'settings:read': '设置查看',
        'settings:write': '设置管理',
      };
      return permissionMap[permission] || permission;
    });
  },
};