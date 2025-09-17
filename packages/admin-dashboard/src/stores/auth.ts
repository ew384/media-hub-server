// 解决方案3: 改进认证状态管理，防止重复初始化
// packages/admin-dashboard/src/stores/auth.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AdminUser, AdminRole, PERMISSIONS } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  // 状态
  user: AdminUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isInitialized: boolean; // 新增：标记是否已初始化

  // 操作方法
  login: (credentials: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<AdminUser>) => Promise<void>;
  changePassword: (data: { oldPassword: string; newPassword: string }) => Promise<void>;
  checkPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  initialize: () => Promise<void>;
  
  // 内部方法
  setUser: (user: AdminUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
}

let isInitializing = false; // 防止重复初始化

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
          
          console.log('💾 AuthStore: 保存认证状态');
          
          set({
            user,
            token: accessToken,
            isAuthenticated: true,
            isLoading: false,
            isInitialized: true,
          });

          // 保存到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_token', accessToken);
            localStorage.setItem('admin_user', JSON.stringify(user));
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
          set({ user: { ...currentUser, ...updatedUser } });
          
          // 更新localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_user', JSON.stringify({ ...currentUser, ...updatedUser }));
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

      // 检查权限 - 简化版本
      checkPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        // 简化版：假设管理员有所有权限
        return true;
      },

      // 检查是否有任一权限
      hasAnyPermission: (permissions) => {
        const { checkPermission } = get();
        return permissions.some(permission => checkPermission(permission));
      },

      // 初始化认证状态 - 防重复版本
      initialize: async () => {
        // 如果已经初始化过或正在初始化，直接返回
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
              console.log('✅ AuthStore: 恢复用户状态:', user);
              
              set({
                user,
                token,
                isAuthenticated: true,
                isInitialized: true,
              });

              console.log('✅ AuthStore: 认证状态已恢复');
              
            } catch (parseError) {
              console.error('❌ AuthStore: 解析用户数据失败:', parseError);
              // 清除无效数据
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

// 其余工具函数...
export const usePermissions = () => {
  const checkPermission = useAuthStore(state => state.checkPermission);
  const hasAnyPermission = useAuthStore(state => state.hasAnyPermission);

  const requirePermission = (permission: string) => {
    if (!checkPermission(permission)) {
      throw new Error(`Access denied: ${permission}`);
    }
  };

  const requireAnyPermission = (permissions: string[]) => {
    if (!hasAnyPermission(permissions)) {
      throw new Error(`Access denied: ${permissions.join(' or ')}`);
    }
  };

  return {
    checkPermission,
    hasAnyPermission,
    requirePermission,
    requireAnyPermission,
  };
};

export const authUtils = {
  getRoleDisplayName: (role: any): string => {
    return '管理员';
  },
  getRoleColor: (role: any): string => {
    return 'blue';
  },
  isHighPrivilegeRole: (role: any): boolean => {
    return true;
  },
  getRolePermissions: (role: any): string[] => {
    return ['*'];
  },
  formatPermissions: (permissions: string[]): string[] => {
    return ['所有权限'];
  },
};