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

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // 初始状态
      user: null,
      token: null,
      isLoading: false,
      isAuthenticated: false,

      // 登录
      login: async (credentials) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(credentials);
          const { user, token } = response;
          
          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });

          // 保存到localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_user', JSON.stringify(user));
          }
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      // 登出
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          console.error('Logout error:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
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

      // 检查权限
      checkPermission: (permission) => {
        const { user } = get();
        if (!user) return false;

        const userPermissions = PERMISSIONS[user.role] || [];
        return userPermissions.includes('*') || userPermissions.includes(permission);
      },

      // 检查是否有任一权限
      hasAnyPermission: (permissions) => {
        const { checkPermission } = get();
        return permissions.some(permission => checkPermission(permission));
      },

      // 初始化认证状态
      initialize: async () => {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('admin_token');
        const userStr = localStorage.getItem('admin_user');

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr);
            set({
              user,
              token,
              isAuthenticated: true,
            });

            // 验证token是否有效
            await authApi.getProfile();
          } catch (error) {
            // token无效，清除本地数据
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
            set({
              user: null,
              token: null,
              isAuthenticated: false,
            });
          }
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

// 权限检查Hook
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

// 认证相关工具函数
export const authUtils = {
  // 获取用户角色显示名称
  getRoleDisplayName: (role: AdminRole): string => {
    const roleNames = {
      [AdminRole.SUPER_ADMIN]: '超级管理员',
      [AdminRole.ADMIN]: '管理员',
      [AdminRole.OPERATOR]: '运营',
      [AdminRole.VIEWER]: '查看者',
    };
    return roleNames[role] || role;
  },

  // 获取用户角色颜色
  getRoleColor: (role: AdminRole): string => {
    const roleColors = {
      [AdminRole.SUPER_ADMIN]: 'red',
      [AdminRole.ADMIN]: 'blue',
      [AdminRole.OPERATOR]: 'green',
      [AdminRole.VIEWER]: 'gray',
    };
    return roleColors[role] || 'default';
  },

  // 检查是否为高级权限角色
  isHighPrivilegeRole: (role: AdminRole): boolean => {
    return [AdminRole.SUPER_ADMIN, AdminRole.ADMIN].includes(role);
  },

  // 获取角色权限列表
  getRolePermissions: (role: AdminRole): string[] => {
    return PERMISSIONS[role] || [];
  },

  // 格式化权限显示
  formatPermissions: (permissions: string[]): string[] => {
    const permissionNames: Record<string, string> = {
      'users:read': '查看用户',
      'users:write': '管理用户',
      'orders:read': '查看订单',
      'orders:write': '管理订单',
      'subscriptions:read': '查看订阅',
      'subscriptions:write': '管理订阅',
      'analytics:read': '查看数据',
      'settings:read': '查看设置',
      'settings:write': '管理设置',
      '*': '所有权限',
    };

    return permissions.map(permission => permissionNames[permission] || permission);
  },
};
