import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import { ApiResponse, PaginatedResponse } from '@/types';

// API基础配置
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        // 添加认证token
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // 添加时间戳防止缓存
        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        const { data } = response;
        
        // 处理业务错误码
        if (data.code !== 200) {
          message.error(data.message || '请求失败');
          return Promise.reject(new Error(data.message));
        }

        return response;
      },
      (error) => {
        // 处理HTTP错误
        if (error.response) {
          const { status, data } = error.response;
          
          switch (status) {
            case 401:
              message.error('登录已过期，请重新登录');
              this.removeToken();
              window.location.href = '/login';
              break;
            case 403:
              message.error('没有权限访问');
              break;
            case 404:
              message.error('请求的资源不存在');
              break;
            case 500:
              message.error('服务器内部错误');
              break;
            default:
              message.error(data?.message || '网络错误，请稍后重试');
          }
        } else if (error.request) {
          message.error('网络连接失败，请检查网络');
        } else {
          message.error('请求失败');
        }

        return Promise.reject(error);
      }
    );
  }

  // Token管理
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_token');
    }
    return null;
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
    }
  }

  // 基础请求方法
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  }

  // 文件上传
  async upload(url: string, file: File, onProgress?: (progress: number) => void): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data;
  }

  // 下载文件
  async download(url: string, filename?: string): Promise<void> {
    const response = await this.client.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// 创建API客户端实例
const apiClient = new ApiClient();

// ==================== 认证相关API ====================
export const authApi = {
  // 管理员登录
  login: (credentials: { username: string; password: string }) =>
    apiClient.post('/admin/auth/login', credentials),

  // 管理员登出
  logout: () => apiClient.post('/admin/auth/logout'),

  // 获取管理员信息
  getProfile: () => apiClient.get('/admin/auth/profile'),

  // 更新管理员信息
  updateProfile: (data: any) => apiClient.put('/admin/auth/profile', data),

  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiClient.put('/admin/auth/password', data),
};

// ==================== 数据统计API ====================
export const dashboardApi = {
  // 获取概览统计
  getStats: () => apiClient.get('/admin/dashboard/stats'),

  // 获取趋势数据
  getTrends: (params?: { dateRange?: [string, string] }) =>
    apiClient.get('/admin/dashboard/trends', { params }),

  // 获取实时数据
  getRealtime: () => apiClient.get('/admin/dashboard/realtime'),
};

// ==================== 用户管理API ====================
export const userApi = {
  // 获取用户列表
  getUsers: (params: any): Promise<PaginatedResponse> =>
    apiClient.get('/admin/users', { params }),

  // 获取用户详情
  getUserDetail: (id: number) => apiClient.get(`/admin/users/${id}`),

  // 更新用户状态
  updateUserStatus: (id: number, status: number) =>
    apiClient.put(`/admin/users/${id}/status`, { status }),

  // 重置用户密码
  resetPassword: (id: number) =>
    apiClient.post(`/admin/users/${id}/reset-password`),

  // 修改用户订阅
  updateSubscription: (id: number, data: any) =>
    apiClient.put(`/admin/users/${id}/subscription`, data),

  // 添加用户备注
  addNote: (id: number, note: string) =>
    apiClient.post(`/admin/users/${id}/notes`, { note }),

  // 获取用户登录历史
  getLoginHistory: (id: number, params?: any) =>
    apiClient.get(`/admin/users/${id}/login-history`, { params }),

  // 批量操作用户
  batchAction: (action: string, ids: number[], data?: any) =>
    apiClient.post('/admin/users/batch', { action, ids, data }),
};

// ==================== 订单管理API ====================
export const orderApi = {
  // 获取订单列表
  getOrders: (params: any): Promise<PaginatedResponse> =>
    apiClient.get('/admin/orders', { params }),

  // 获取订单详情
  getOrderDetail: (orderNo: string) => apiClient.get(`/admin/orders/${orderNo}`),

  // 申请退款
  refundOrder: (orderNo: string, data: { amount: number; reason: string }) =>
    apiClient.post(`/admin/orders/${orderNo}/refund`, data),

  // 取消订单
  cancelOrder: (orderNo: string) =>
    apiClient.put(`/admin/orders/${orderNo}/cancel`),

  // 手动确认订单
  confirmOrder: (orderNo: string) =>
    apiClient.put(`/admin/orders/${orderNo}/confirm`),

  // 添加订单备注
  addNote: (orderNo: string, note: string) =>
    apiClient.post(`/admin/orders/${orderNo}/notes`, { note }),

  // 获取订单时间线
  getTimeline: (orderNo: string) =>
    apiClient.get(`/admin/orders/${orderNo}/timeline`),
};

// ==================== 订阅管理API ====================
export const subscriptionApi = {
  // 获取订阅列表
  getSubscriptions: (params: any): Promise<PaginatedResponse> =>
    apiClient.get('/admin/subscriptions', { params }),

  // 获取订阅详情
  getSubscriptionDetail: (id: number) =>
    apiClient.get(`/admin/subscriptions/${id}`),

  // 延长订阅
  extendSubscription: (id: number, days: number) =>
    apiClient.put(`/admin/subscriptions/${id}/extend`, { days }),

  // 取消订阅
  cancelSubscription: (id: number) =>
    apiClient.put(`/admin/subscriptions/${id}/cancel`),

  // 批量操作订阅
  batchAction: (action: string, ids: number[], data?: any) =>
    apiClient.post('/admin/subscriptions/batch', { action, ids, data }),

  // 获取即将到期订阅
  getExpiring: (days: number = 7) =>
    apiClient.get('/admin/subscriptions/expiring', { params: { days } }),
};

// ==================== 数据分析API ====================
export const analyticsApi = {
  // 用户分析数据
  getUserAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.get('/admin/analytics/users', { params }),

  // 收入分析数据
  getRevenueAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.get('/admin/analytics/revenue', { params }),

  // 订阅分析数据
  getSubscriptionAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.get('/admin/analytics/subscriptions', { params }),

  // 导出报表
  exportReport: (type: string, params: any) =>
    apiClient.download('/admin/analytics/export', `${type}_report.xlsx`),
};

// ==================== 系统设置API ====================
export const settingsApi = {
  // 获取系统设置
  getSettings: () => apiClient.get('/admin/settings'),

  // 更新系统设置
  updateSettings: (data: any) => apiClient.put('/admin/settings', data),

  // 获取套餐配置
  getPlans: () => apiClient.get('/admin/settings/plans'),

  // 更新套餐配置
  updatePlans: (data: any) => apiClient.put('/admin/settings/plans', data),
};

// ==================== 系统日志API ====================
export const logApi = {
  // 获取系统日志
  getLogs: (params: any): Promise<PaginatedResponse> =>
    apiClient.get('/admin/logs', { params }),

  // 清理日志
  clearLogs: (before: string) =>
    apiClient.delete('/admin/logs', { params: { before } }),
};

// ==================== 通知API ====================
export const notificationApi = {
  // 获取通知列表
  getNotifications: (params?: any) =>
    apiClient.get('/admin/notifications', { params }),

  // 标记已读
  markAsRead: (ids: number[]) =>
    apiClient.put('/admin/notifications/read', { ids }),

  // 发送通知
  sendNotification: (data: {
    userIds: number[];
    title: string;
    message: string;
    type: string;
  }) => apiClient.post('/admin/notifications/send', data),
};

export default apiClient;
