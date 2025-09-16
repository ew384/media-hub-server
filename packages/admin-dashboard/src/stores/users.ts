import { create } from 'zustand';
import { userApi } from '@/lib/api';
import { UserProfile, PaginatedResponse, TableFilterParams, BatchActionParams } from '@/types';
import { PAGINATION_CONFIG, USER_STATUS } from '@/lib/constants';
import { message } from 'antd';

interface UserFilters {
  search: string;
  status: 'all' | '1' | '0';
  subscriptionStatus: 'all' | 'active' | 'expired' | 'none';
  dateRange?: [string, string];
}

interface UserState {
  // 状态数据
  users: UserProfile[];
  selectedUser: UserProfile | null;
  loading: boolean;
  error: string | null;
  
  // 分页数据
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
  
  // 筛选条件
  filters: UserFilters;
  
  // 批量操作
  selectedRowKeys: React.Key[];
  
  // 操作方法
  fetchUsers: () => Promise<void>;
  fetchUserDetail: (id: number) => Promise<UserProfile | null>;
  createUser: (userData: any) => Promise<void>;
  updateUser: (id: number, userData: any) => Promise<void>;
  updateUserStatus: (id: number, status: number) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
  resetPassword: (id: number) => Promise<void>;
  extendSubscription: (id: number, days: number) => Promise<void>;
  addUserNote: (id: number, note: string) => Promise<void>;
  batchAction: (action: string, data?: any) => Promise<void>;
  exportUsers: (format: string) => Promise<void>;
  
  // 分页控制
  setPagination: (pagination: Partial<typeof UserState.prototype.pagination>) => void;
  setFilters: (filters: Partial<UserFilters>) => void;
  resetFilters: () => void;
  
  // 选择控制
  setSelectedRowKeys: (keys: React.Key[]) => void;
  clearSelection: () => void;
  
  // 内部方法
  setUsers: (users: UserProfile[]) => void;
  setSelectedUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  // 初始状态
  users: [],
  selectedUser: null,
  loading: false,
  error: null,
  
  pagination: {
    current: PAGINATION_CONFIG.DEFAULT_PAGE,
    pageSize: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    total: 0,
  },
  
  filters: {
    search: '',
    status: 'all',
    subscriptionStatus: 'all',
    dateRange: undefined,
  },
  
  selectedRowKeys: [],

  // 获取用户列表
  fetchUsers: async () => {
    const { pagination, filters } = get();
    set({ loading: true, error: null });
    
    try {
      const params: TableFilterParams = {
        current: pagination.current,
        pageSize: pagination.pageSize,
        ...filters,
      };
      
      const response: PaginatedResponse<UserProfile> = await userApi.getUsers(params);
      
      set({
        users: response.data,
        pagination: {
          ...pagination,
          total: response.pagination.total,
        },
        loading: false,
      });
    } catch (error: any) {
      set({
        error: error.message || '获取用户列表失败',
        loading: false,
      });
      message.error(error.message || '获取用户列表失败');
    }
  },

  // 获取用户详情
  fetchUserDetail: async (id: number) => {
    try {
      const user = await userApi.getUserDetail(id);
      set({ selectedUser: user });
      return user;
    } catch (error: any) {
      message.error(error.message || '获取用户详情失败');
      return null;
    }
  },

  // 创建用户
  createUser: async (userData: any) => {
    try {
      await userApi.createUser(userData);
      message.success('用户创建成功');
      get().fetchUsers(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || '用户创建失败');
      throw error;
    }
  },

  // 更新用户
  updateUser: async (id: number, userData: any) => {
    try {
      await userApi.updateUser(id, userData);
      message.success('用户信息更新成功');
      get().fetchUsers(); // 刷新列表
      
      // 如果是当前选中用户，更新详情
      const { selectedUser } = get();
      if (selectedUser && selectedUser.id === id) {
        get().fetchUserDetail(id);
      }
    } catch (error: any) {
      message.error(error.message || '用户信息更新失败');
      throw error;
    }
  },

  // 更新用户状态
  updateUserStatus: async (id: number, status: number) => {
    try {
      await userApi.updateUserStatus(id, status);
      message.success(`用户${status === USER_STATUS.ACTIVE ? '启用' : '禁用'}成功`);
      get().fetchUsers(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || '用户状态更新失败');
      throw error;
    }
  },

  // 删除用户
  deleteUser: async (id: number) => {
    try {
      await userApi.deleteUser(id);
      message.success('用户删除成功');
      get().fetchUsers(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || '用户删除失败');
      throw error;
    }
  },

  // 重置密码
  resetPassword: async (id: number) => {
    try {
      const result = await userApi.resetPassword(id);
      message.success(`密码重置成功，新密码：${result.newPassword}`);
    } catch (error: any) {
      message.error(error.message || '密码重置失败');
      throw error;
    }
  },

  // 延长订阅
  extendSubscription: async (id: number, days: number) => {
    try {
      await userApi.updateSubscription(id, { extendDays: days });
      message.success(`订阅延长${days}天成功`);
      get().fetchUsers(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || '订阅延长失败');
      throw error;
    }
  },

  // 添加用户备注
  addUserNote: async (id: number, note: string) => {
    try {
      await userApi.addNote(id, note);
      message.success('备注添加成功');
      get().fetchUserDetail(id); // 刷新详情
    } catch (error: any) {
      message.error(error.message || '备注添加失败');
      throw error;
    }
  },

  // 批量操作
  batchAction: async (action: string, data?: any) => {
    const { selectedRowKeys } = get();
    
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要操作的用户');
      return;
    }

    try {
      const params: BatchActionParams = {
        ids: selectedRowKeys as number[],
        action,
        data,
      };
      
      await userApi.batchAction(params);
      message.success(`批量${action}成功`);
      
      set({ selectedRowKeys: [] }); // 清除选择
      get().fetchUsers(); // 刷新列表
    } catch (error: any) {
      message.error(error.message || `批量${action}失败`);
      throw error;
    }
  },

  // 导出用户数据
  exportUsers: async (format: string) => {
    try {
      const { filters } = get();
      await userApi.exportUsers(format, filters);
      message.success('数据导出成功');
    } catch (error: any) {
      message.error(error.message || '数据导出失败');
      throw error;
    }
  },

  // 设置分页
  setPagination: (newPagination) => {
    set(state => ({
      pagination: { ...state.pagination, ...newPagination }
    }));
  },

  // 设置筛选条件
  setFilters: (newFilters) => {
    set(state => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, current: 1 }, // 重置到第一页
    }));
  },

  // 重置筛选条件
  resetFilters: () => {
    set({
      filters: {
        search: '',
        status: 'all',
        subscriptionStatus: 'all',
        dateRange: undefined,
      },
      pagination: {
        current: PAGINATION_CONFIG.DEFAULT_PAGE,
        pageSize: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
        total: 0,
      },
    });
  },

  // 设置选中的行
  setSelectedRowKeys: (keys) => {
    set({ selectedRowKeys: keys });
  },

  // 清除选择
  clearSelection: () => {
    set({ selectedRowKeys: [] });
  },

  // 内部方法
  setUsers: (users) => set({ users }),
  setSelectedUser: (user) => set({ selectedUser: user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));

// 用户管理相关工具函数
export const userUtils = {
  // 获取用户状态显示
  getStatusDisplay: (status: number) => {
    return status === USER_STATUS.ACTIVE ? '正常' : '禁用';
  },

  // 获取用户状态颜色
  getStatusColor: (status: number) => {
    return status === USER_STATUS.ACTIVE ? 'green' : 'red';
  },

  // 获取订阅状态显示
  getSubscriptionStatusDisplay: (status: string) => {
    const statusMap: Record<string, string> = {
      active: '活跃',
      expired: '已过期',
      none: '未订阅',
    };
    return statusMap[status] || status;
  },

  // 获取订阅状态颜色
  getSubscriptionStatusColor: (status: string) => {
    const colorMap: Record<string, string> = {
      active: 'green',
      expired: 'orange',
      none: 'gray',
    };
    return colorMap[status] || 'default';
  },

  // 计算用户价值等级
  getUserValueLevel: (totalSpent: number) => {
    if (totalSpent >= 5000) return { level: 'VIP', color: 'gold' };
    if (totalSpent >= 2000) return { level: '高价值', color: 'orange' };
    if (totalSpent >= 500) return { level: '中价值', color: 'blue' };
    return { level: '普通', color: 'default' };
  },

  // 格式化用户注册时间
  formatRegistrationTime: (createdAt: string) => {
    const now = new Date();
    const registration = new Date(createdAt);
    const diffInDays = Math.floor((now.getTime() - registration.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return '今天注册';
    if (diffInDays === 1) return '昨天注册';
    if (diffInDays < 7) return `${diffInDays}天前注册`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}周前注册`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)}个月前注册`;
    return `${Math.floor(diffInDays / 365)}年前注册`;
  },

  // 生成用户统计数据
  generateUserStats: (users: UserProfile[]) => {
    const total = users.length;
    const active = users.filter(u => u.status === USER_STATUS.ACTIVE).length;
    const hasSubscription = users.filter(u => u.subscription_status === 'active').length;
    const totalSpent = users.reduce((sum, u) => sum + u.total_spent, 0);
    
    return {
      total,
      active,
      activeRate: total > 0 ? (active / total * 100).toFixed(1) : '0',
      hasSubscription,
      subscriptionRate: total > 0 ? (hasSubscription / total * 100).toFixed(1) : '0',
      totalSpent,
      avgSpent: total > 0 ? (totalSpent / total).toFixed(2) : '0',
    };
  },

  // 用户数据验证
  validateUserData: (userData: any) => {
    const errors: string[] = [];

    if (!userData.username || userData.username.length < 3) {
      errors.push('用户名至少3个字符');
    }

    if (!userData.phone || !/^1[3-9]\d{9}$/.test(userData.phone)) {
      errors.push('请输入正确的手机号');
    }

    if (!userData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
      errors.push('请输入正确的邮箱格式');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};