// packages/admin-dashboard/src/lib/api.ts - 修复token获取问题

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

      this.setupInterceptors(this.clients[service], service);
    });
  }

  private setupInterceptors(client: AxiosInstance, serviceName: string) {
    // 请求拦截器 - 修复版本
    client.interceptors.request.use(
      (config) => {
        const token = this.getToken();
        console.log(`🔗 ${serviceName} API请求:`, {
          url: config.url,
          method: config.method,
          hasToken: !!token,
          token: token ? `${token.substring(0, 20)}...` : null
        });

        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          console.warn(`⚠️ ${serviceName} API请求缺少token`);
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

    // 响应拦截器 - 修复版本
    client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ ${serviceName} API响应成功:`, {
          status: response.status,
          url: response.config.url,
        });

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
        console.error(`❌ ${serviceName} API错误:`, {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message,
        });

        if (error.response) {
          const { status, data } = error.response;
          
          switch (status) {
            case 401:
              console.warn('🔒 认证失败，token可能无效');
              message.error('登录已过期，请重新登录');
              this.removeToken();
              // 延迟跳转，避免立即跳转
              setTimeout(() => {
                if (window.location.pathname !== '/login') {
                  window.location.href = '/login';
                }
              }, 1000);
              break;
            case 403:
              message.error('没有权限访问');
              break;
            case 404:
              // 404错误不显示消息，只记录日志
              console.warn(`⚠️ ${serviceName} 接口不存在:`, error.config?.url);
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

  // 修复token获取方法
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // 优先从 zustand store 获取
    try {
      const authStorage = localStorage.getItem('admin-auth-storage');
      if (authStorage) {
        const parsedStorage = JSON.parse(authStorage);
        const token = parsedStorage.state?.token;
        if (token) {
          return token;
        }
      }
    } catch (error) {
      console.warn('从zustand storage获取token失败:', error);
    }
    
    // 备选：从直接localStorage获取
    const directToken = localStorage.getItem('admin_token');
    if (directToken) {
      return directToken;
    }
    
    return null;
  }

  private removeToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_user');
      localStorage.removeItem('admin-auth-storage');
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
  login: (credentials: { username: string; password: string }) => {
    const email = credentials.username.includes('@') 
      ? credentials.username 
      : `${credentials.username}@example.com`;

    return apiClient.auth.post('/auth/login', {
      type: 'email',
      email: email,
      password: credentials.password,
    });
  },

  logout: () => apiClient.auth.post('/auth/logout'),
  getProfile: () => apiClient.auth.get('/auth/profile'),
  updateProfile: (data: any) => apiClient.auth.put('/auth/profile', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiClient.auth.put('/auth/password', data),
};

// ==================== 数据统计API - 使用模拟数据避免404 ====================
export const dashboardApi = {
  getStats: async () => {
    // 暂时返回模拟数据，避免404错误
    console.log('📊 使用模拟数据返回统计信息');
    return {
      overview: {
        totalUsers: 1250,
        activeUsers: 890,
        totalRevenue: 125680,
        monthlyRevenue: 45230,
        conversionRate: 12.5,
        userGrowthRate: 15.8,
      },
      subscriptions: {
        activeSubscriptions: 680,
        expiringSubscriptions: 45,
        planDistribution: {
          monthly: 320,
          quarterly: 250,
          yearly: 110,
        },
      },
      payments: {
        todayOrders: 12,
        todayRevenue: 1800,
        successRate: 98.5,
        methodDistribution: {
          alipay: 65,
          wechat: 35,
        },
      },
    };
  },

  getTrends: async (params?: { dateRange?: [string, string] }) => {
    console.log('📈 使用模拟数据返回趋势信息');
    return {
      userRegistrations: [
        { date: '2024-12-01', count: 15 },
        { date: '2024-12-02', count: 23 },
        { date: '2024-12-03', count: 18 },
      ],
      revenue: [
        { date: '2024-12-01', amount: 1200, orders: 8 },
        { date: '2024-12-02', amount: 1800, orders: 12 },
        { date: '2024-12-03', amount: 960, orders: 6 },
      ],
      subscriptions: [
        { date: '2024-12-01', new: 5, renewed: 3, cancelled: 1 },
        { date: '2024-12-02', new: 8, renewed: 4, cancelled: 2 },
        { date: '2024-12-03', new: 6, renewed: 2, cancelled: 0 },
      ],
    };
  },

  getRealtime: async () => {
    console.log('⚡ 使用模拟数据返回实时信息');
    return {
      onlineUsers: 145,
      todayVisitors: 892,
      activeOrders: 23,
    };
  },
};

// 其余API保持不变...
export const userApi = {
  getUsers: (params: any): Promise<PaginatedResponse> =>
    apiClient.subscription.get('/admin/users', { params }),
  getUserDetail: (id: number) => apiClient.auth.get(`/users/${id}`),
  updateUserStatus: (id: number, status: number) =>
    apiClient.subscription.put(`/admin/users/${id}/status`, { status }),
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

export const subscriptionApi = {
  getSubscriptions: (params: any): Promise<PaginatedResponse> =>
    apiClient.subscription.get('/admin/subscriptions', { params }),
  getSubscriptionDetail: (id: number) =>
    apiClient.subscription.get(`/admin/subscriptions/${id}`),
  extendSubscription: (id: number, days: number) =>
    apiClient.subscription.post('/admin/subscription/extend', { userId: id, days }),
  cancelSubscription: (id: number) =>
    apiClient.subscription.put(`/admin/subscriptions/${id}/cancel`),
  batchAction: (action: string, ids: number[], data?: any) =>
    apiClient.subscription.post('/admin/subscriptions/batch', { action, ids, data }),
  getExpiring: (days: number = 7) =>
    apiClient.subscription.get('/admin/subscriptions/expiring', { params: { days } }),
};

export const analyticsApi = {
  getUserAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.subscription.get('/admin/analytics/users', { params }),
  getRevenueAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.payment.get('/admin/payment/statistics', { params }),
  getSubscriptionAnalytics: (params: { dateRange?: [string, string] }) =>
    apiClient.subscription.get('/admin/subscriptions/stats', { params }),
  exportReport: (type: string, params: any) =>
    apiClient.subscription.get('/admin/export', { params }),
};

export const settingsApi = {
  getSettings: () => apiClient.subscription.get('/admin/settings'),
  updateSettings: (data: any) => apiClient.subscription.put('/admin/settings', data),
  getPlans: () => apiClient.subscription.get('/admin/plans'),
  updatePlans: (data: any) => apiClient.subscription.put('/admin/plans', data),
};

export const logApi = {
  getLogs: (params: any): Promise<PaginatedResponse> =>
    apiClient.subscription.get('/admin/logs', { params }),
  clearLogs: (before: string) =>
    apiClient.subscription.delete('/admin/logs', { params: { before } }),
};

export const notificationApi = {
  getNotifications: (params?: any) =>
    apiClient.subscription.get('/admin/notifications', { params }),
  markAsRead: (ids: number[]) =>
    apiClient.subscription.put('/admin/notifications/read', { ids }),
  sendNotification: (data: {
    userIds: number[];
    title: string;
    message: string;
    type: string;
  }) => apiClient.subscription.post('/admin/notifications/send', data),
};

export default apiClient;