// packages/admin-dashboard/src/lib/api.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { message } from 'antd';
import { ApiResponse, PaginatedResponse } from '@/types';

// 多服务API配置
const API_URLS = {
  auth: process.env.NEXT_PUBLIC_AUTH_API_URL || 'http://localhost:3100/api/v1',
  subscription: process.env.NEXT_PUBLIC_SUBSCRIPTION_API_URL || 'http://localhost:3101',
  payment: process.env.NEXT_PUBLIC_PAYMENT_API_URL || 'http://localhost:3102',
};

class MultiServiceApiClient {
  private clients: { [key: string]: AxiosInstance } = {};

  constructor() {
    // 为每个服务创建独立的客户端
    Object.entries(API_URLS).forEach(([service, baseURL]) => {
      this.clients[service] = axios.create({
        baseURL,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      this.setupInterceptors(this.clients[service]);
    });
  }

  private setupInterceptors(client: AxiosInstance) {
    // 请求拦截器
    client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        if (config.method === 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    client.interceptors.response.use(
      (response: AxiosResponse) => {
        // 处理不同服务的响应格式
        if (response.data?.code !== undefined) {
          // 统一响应格式的服务
          if (response.data.code !== 200) {
            message.error(response.data.message || '请求失败');
            return Promise.reject(new Error(response.data.message));
          }
        }
        return response;
      },
      (error) => {
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
        } else {
          message.error('网络连接失败，请检查网络');
        }

        return Promise.reject(error);
      }
    );
  }

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

  // 通用请求方法
  private async request<T = any>(
    service: keyof typeof API_URLS,
    method: 'get' | 'post' | 'put' | 'delete',
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const client = this.clients[service];
    if (!client) {
      throw new Error(`未知的服务: ${service}`);
    }

    const response = await client.request({
      method,
      url,
      data,
      ...config,
    });

    // 根据不同服务返回相应的数据格式
    return response.data?.data !== undefined ? response.data.data : response.data;
  }

  // 各服务的请求方法
  auth = {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
      this.request('auth', 'get', url, undefined, config),
    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      this.request('auth', 'post', url, data, config),
    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      this.request('auth', 'put', url, data, config),
    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
      this.request('auth', 'delete', url, undefined, config),
  };

  subscription = {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
      this.request('subscription', 'get', url, undefined, config),
    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      this.request('subscription', 'post', url, data, config),
    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      this.request('subscription', 'put', url, data, config),
    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
      this.request('subscription', 'delete', url, undefined, config),
  };

  payment = {
    get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
      this.request('payment', 'get', url, undefined, config),
    post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      this.request('payment', 'post', url, data, config),
    put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> =>
      this.request('payment', 'put', url, data, config),
    delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> =>
      this.request('payment', 'delete', url, undefined, config),
  };
}

// 创建API客户端实例
const apiClient = new MultiServiceApiClient();

// ==================== 认证相关API ====================
export const authApi = {
  // 管理员登录 - 复用普通用户登录
  login: (credentials: { username: string; password: string }) =>
    apiClient.auth.post('/auth/login', {
      type: 'email',
      email: credentials.username, // 假设管理员用邮箱登录
      password: credentials.password,
    }),

  logout: () => apiClient.auth.post('/auth/logout'),
  getProfile: () => apiClient.auth.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.auth.put('/auth/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiClient.auth.put('/auth/password', data), // 这个接口需要后端实现
};

// ==================== 数据统计API ====================
export const dashboardApi = {
  getStats: () => apiClient.subscription.get('/admin/subscriptions/stats'),
  getTrends: (params?: { dateRange?: [string, string] }) =>
    apiClient.subscription.get('/admin/dashboard/trends', { params }),
  getRealtime: () => apiClient.subscription.get('/admin/dashboard/realtime'),
};

// ==================== 用户管理API ====================
export const userApi = {
  getUsers: (params: any): Promise<PaginatedResponse> =>
    apiClient.subscription.get('/admin/users', { params }), // 需要后端实现
  getUserDetail: (id: number) => apiClient.auth.get(`/users/${id}`), // 需要后端实现
  updateUserStatus: (id: number, status: number) =>
    apiClient.subscription.put(`/admin/users/${id}/status`, { status }), // 需要后端实现
  resetPassword: (id: number) =>
    apiClient.auth.post(`/users/${id}/reset-password`),
  updateSubscription: (id: number, data: any) =>
    apiClient.subscription.put(`/admin/subscription/${id}`, data),
  addNote: (id: number, note: string) =>
    apiClient.subscription.post(`/admin/users/${id}/notes`, { note }),
  getLoginHistory: (id: number, params?: any) =>
    apiClient.auth.get(`/users/${id}/login-history`, { params }),
  batchAction: (action: string, ids: number[], data?: any) =>
    apiClient.subscription.post('/admin/users/batch', { action, ids, data }),
};

// ==================== 订单管理API ====================
export const orderApi = {
  getOrders: (params: any): Promise<PaginatedResponse> =>
    apiClient.payment.get('/admin/payment/orders', { params }),
  getOrderDetail: (orderNo: string) =>
    apiClient.payment.get(`/admin/payment/orders/${orderNo}`),
  refundOrder: (orderNo: string, data: { amount: number; reason: string }) =>
    apiClient.payment.post('/admin/payment/refunds', { orderNo, ...data }),
  cancelOrder: (orderNo: string) =>
    apiClient.payment.put(`/admin/payment/orders/${orderNo}/cancel`),
  confirmOrder: (orderNo: string) =>
    apiClient.payment.put(`/admin/payment/orders/${orderNo}/confirm`),
  addNote: (orderNo: string, note: string) =>
    apiClient.payment.post(`/admin/payment/orders/${orderNo}/notes`, { note }),
  getTimeline: (orderNo: string) =>
    apiClient.payment.get(`/admin/payment/orders/${orderNo}/timeline`),
};

// ==================== 订阅管理API ====================
export const subscriptionApi = {
  getSubscriptions: (params: any): Promise<PaginatedResponse> =>
    apiClient.subscription.get('/admin/subscriptions', { params }), // 需要后端实现
  getSubscriptionDetail: (id: number) =>
    apiClient.subscription.get(`/admin/subscriptions/${id}`), // 需要后端实现
  extendSubscription: (id: number, days: number) =>
    apiClient.subscription.post('/admin/subscription/extend', { userId: id, days }),
  cancelSubscription: (id: number) =>
    apiClient.subscription.put(`/admin/subscriptions/${id}/cancel`),
  batchAction: (action: string, ids: number[], data?: any) =>
    apiClient.subscription.post('/admin/subscriptions/batch', { action, ids, data }),
  getExpiring: (days: number = 7) =>
    apiClient.subscription.get('/admin/subscriptions/expiring', { params: { days } }),
};

// ==================== 数据分析API ====================
export const analyticsApi = {
  // 用户分析数据
  getUserAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.subscription.get('/admin/analytics/users', { params }),

  // 收入分析数据
  getRevenueAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.payment.get('/admin/payment/statistics', { params }),

  // 订阅分析数据
  getSubscriptionAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.subscription.get('/admin/subscriptions/stats', { params }),

  // 导出报表
  exportReport: (type: string, params: any) =>
    apiClient.subscription.get('/admin/export', { params }),
};

// ==================== 系统设置API ====================
export const settingsApi = {
  // 获取系统设置
  getSettings: () => apiClient.subscription.get('/admin/settings'),

  // 更新系统设置
  updateSettings: (data: any) => apiClient.subscription.put('/admin/settings', data),

  // 获取套餐配置
  getPlans: () => apiClient.subscription.get('/admin/plans'),

  // 更新套餐配置
  updatePlans: (data: any) => apiClient.subscription.put('/admin/plans', data),
};

// ==================== 系统日志API ====================
export const logApi = {
  // 获取系统日志
  getLogs: (params: any): Promise<PaginatedResponse> =>
    apiClient.subscription.get('/admin/logs', { params }),

  // 清理日志
  clearLogs: (before: string) =>
    apiClient.subscription.delete('/admin/logs', { params: { before } }),
};

// ==================== 通知API ====================
export const notificationApi = {
  // 获取通知列表
  getNotifications: (params?: any) =>
    apiClient.subscription.get('/admin/notifications', { params }),

  // 标记已读
  markAsRead: (ids: number[]) =>
    apiClient.subscription.put('/admin/notifications/read', { ids }),

  // 发送通知
  sendNotification: (data: {
    userIds: number[];
    title: string;
    message: string;
    type: string;
  }) => apiClient.subscription.post('/admin/notifications/send', data),
};

export default apiClient;