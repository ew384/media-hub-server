// ==================== 用户相关类型 ====================
export interface UserBasicInfo {
  id: number;
  username: string;
  phone: string;
  email: string;
  avatar?: string;
  status: 0 | 1; // 0: 禁用, 1: 启用
  created_at: string;
  updated_at: string;
  last_login_at?: string;
  last_login_ip?: string;
}

export interface UserProfile extends UserBasicInfo {
  nickname?: string;
  gender?: 'male' | 'female' | 'unknown';
  birthday?: string;
  region?: string;
  bio?: string;
  subscription_status: 'none' | 'active' | 'expired';
  subscription_expires_at?: string;
  total_orders: number;
  total_spent: number;
}

export interface LoginHistory {
  id: number;
  user_id: number;
  login_time: string;
  ip_address: string;
  user_agent: string;
  platform: string;
  location?: string;
}

// ==================== 订单相关类型 ====================
export interface OrderInfo {
  id: number;
  order_no: string;
  user_id: number;
  user?: UserBasicInfo;
  plan_type: 'monthly' | 'quarterly' | 'yearly';
  amount: number;
  original_amount: number;
  discount_amount: number;
  status: 'pending' | 'paid' | 'cancelled' | 'refunded' | 'expired';
  payment_method: 'alipay' | 'wechat';
  payment_status: 'pending' | 'success' | 'failed';
  created_at: string;
  paid_at?: string;
  expired_at: string;
  notes?: string;
}

export interface PaymentInfo {
  payment_id: string;
  order_no: string;
  amount: number;
  payment_method: 'alipay' | 'wechat';
  transaction_id?: string;
  payment_time?: string;
  callback_data?: any;
}

export interface OrderTimeline {
  id: number;
  order_no: string;
  event: string;
  description: string;
  operator?: string;
  created_at: string;
}

// ==================== 订阅相关类型 ====================
export interface SubscriptionInfo {
  id: number;
  user_id: number;
  user?: UserBasicInfo;
  plan_type: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'expired' | 'cancelled';
  start_date: string;
  end_date: string;
  auto_renew: boolean;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionHistory {
  id: number;
  user_id: number;
  plan_type: 'monthly' | 'quarterly' | 'yearly';
  start_date: string;
  end_date: string;
  amount: number;
  order_no: string;
  created_at: string;
}

export interface PlanConfig {
  id: number;
  name: string;
  type: 'monthly' | 'quarterly' | 'yearly';
  price: number;
  original_price: number;
  features: string[];
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

// ==================== 管理员相关类型 ====================
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  OPERATOR = 'operator',
  VIEWER = 'viewer'
}

export interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: AdminRole;
  avatar?: string;
  permissions: string[];
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// ==================== 数据统计类型 ====================
export interface DashboardStats {
  overview: {
    totalUsers: number;
    activeUsers: number;
    totalRevenue: number;
    monthlyRevenue: number;
    conversionRate: number;
    userGrowthRate: number;
  };
  
  subscriptions: {
    activeSubscriptions: number;
    expiringSubscriptions: number;
    planDistribution: {
      monthly: number;
      quarterly: number;
      yearly: number;
    };
  };
  
  payments: {
    todayOrders: number;
    todayRevenue: number;
    successRate: number;
    methodDistribution: {
      alipay: number;
      wechat: number;
    };
  };
}

export interface TrendData {
  userRegistrations: Array<{
    date: string;
    count: number;
  }>;
  
  revenue: Array<{
    date: string;
    amount: number;
    orders: number;
  }>;
  
  subscriptions: Array<{
    date: string;
    new: number;
    renewed: number;
    cancelled: number;
  }>;
}

export interface ChartData {
  data: any[];
  config: any;
}

// ==================== API响应类型 ====================
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T;
  timestamp: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
  };
}

// ==================== 表格和表单类型 ====================
export interface TableFilterParams {
  current?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  dateRange?: [string, string];
  [key: string]: any;
}

export interface BatchActionParams {
  ids: number[];
  action: string;
  data?: any;
}

export interface ExportConfig {
  format: 'excel' | 'csv' | 'pdf' | 'image';
  dateRange: [Date, Date];
  columns: string[];
  filters: Record<string, any>;
  template?: string;
  watermark?: string;
}

// ==================== 系统设置类型 ====================
export interface SystemSettings {
  site: {
    name: string;
    description: string;
    logo?: string;
    favicon?: string;
  };
  subscription: {
    plans: PlanConfig[];
    trial_days: number;
    auto_renew_enabled: boolean;
  };
  payment: {
    alipay_enabled: boolean;
    wechat_enabled: boolean;
    min_amount: number;
    max_amount: number;
  };
  notification: {
    email_enabled: boolean;
    sms_enabled: boolean;
    webhook_enabled: boolean;
    templates: any[];
  };
  security: {
    password_min_length: number;
    login_max_attempts: number;
    session_timeout: number;
    two_factor_enabled: boolean;
  };
}

// ==================== WebSocket消息类型 ====================
export interface WebSocketMessage {
  type: 'notification' | 'stats_update' | 'user_action' | 'system_alert';
  data: any;
  timestamp: number;
}

// ==================== 通知类型 ====================
export interface NotificationItem {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
}

// ==================== 日志类型 ====================
export interface SystemLog {
  id: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  module: string;
  action: string;
  message: string;
  user_id?: number;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// ==================== 权限类型 ====================
export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: 'read' | 'write' | 'delete' | '*';
  description?: string;
}

export const PERMISSIONS: Record<AdminRole, string[]> = {
  [AdminRole.SUPER_ADMIN]: ['*'],
  [AdminRole.ADMIN]: [
    'users:read', 'users:write',
    'orders:read', 'orders:write', 
    'subscriptions:read', 'subscriptions:write',
    'analytics:read',
    'settings:read', 'settings:write'
  ],
  [AdminRole.OPERATOR]: [
    'users:read',
    'orders:read', 'orders:write',
    'subscriptions:read', 'subscriptions:write',
    'analytics:read'
  ],
  [AdminRole.VIEWER]: [
    'users:read',
    'orders:read',
    'subscriptions:read',
    'analytics:read'
  ]
};

// ==================== 路由类型 ====================
export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  children?: MenuItem[];
  permission?: string;
}

// ==================== 组件Props类型 ====================
export interface DataTableProps<T = any> {
  data: T[];
  columns: any[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowSelection?: {
    selectedRowKeys: React.Key[];
    onChange: (selectedRowKeys: React.Key[], selectedRows: T[]) => void;
  };
  filters?: Record<string, any>;
  onFiltersChange?: (filters: Record<string, any>) => void;
  actions?: {
    create?: () => void;
    edit?: (record: T) => void;
    delete?: (record: T) => void;
    batchDelete?: (records: T[]) => void;
  };
}
