// ==================== 应用配置常量 ====================

export const APP_CONFIG = {
  NAME: '自媒体管理后台',
  VERSION: '1.0.0',
  DESCRIPTION: '自媒体多账号浏览器管理后台系统',
  AUTHOR: '自媒体团队',
  HOMEPAGE: 'https://github.com/your-repo',
} as const;

// ==================== API配置常量 ====================

export const API_CONFIG = {
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  TIMEOUT: 30000, // 30秒
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1秒
} as const;

// ==================== 分页配置常量 ====================

export const PAGINATION_CONFIG = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 1000,
} as const;

// ==================== 路由路径常量 ====================

export const ROUTES = {
  // 认证相关
  LOGIN: '/login',
  LOGOUT: '/logout',
  
  // 主要页面
  HOME: '/',
  DASHBOARD: '/dashboard',
  
  // 用户管理
  USERS: '/users',
  USER_CREATE: '/users/create',
  USER_DETAIL: (id: string | number) => `/users/${id}`,
  
  // 订单管理
  ORDERS: '/orders',
  ORDER_DETAIL: (orderNo: string) => `/orders/${orderNo}`,
  
  // 订阅管理
  SUBSCRIPTIONS: '/subscriptions',
  
  // 数据分析
  ANALYTICS: '/analytics',
  
  // 系统设置
  SETTINGS: '/settings',
  
  // API路由
  API: {
    AUTH: '/api/auth',
    USERS: '/api/users',
    ORDERS: '/api/orders',
    DASHBOARD: '/api/dashboard',
    ANALYTICS: '/api/analytics',
    SETTINGS: '/api/settings',
  },
} as const;

// ==================== 用户角色和权限常量 ====================

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  VIEWER: 'viewer',
} as const;

export const USER_ROLE_LABELS = {
  [USER_ROLES.SUPER_ADMIN]: '超级管理员',
  [USER_ROLES.ADMIN]: '管理员',
  [USER_ROLES.OPERATOR]: '运营',
  [USER_ROLES.VIEWER]: '查看者',
} as const;

export const USER_ROLE_COLORS = {
  [USER_ROLES.SUPER_ADMIN]: 'red',
  [USER_ROLES.ADMIN]: 'blue',
  [USER_ROLES.OPERATOR]: 'green',
  [USER_ROLES.VIEWER]: 'gray',
} as const;

export const PERMISSIONS = {
  // 用户权限
  USER_READ: 'users:read',
  USER_WRITE: 'users:write',
  
  // 订单权限
  ORDER_READ: 'orders:read',
  ORDER_WRITE: 'orders:write',
  
  // 订阅权限
  SUBSCRIPTION_READ: 'subscriptions:read',
  SUBSCRIPTION_WRITE: 'subscriptions:write',
  
  // 数据分析权限
  ANALYTICS_READ: 'analytics:read',
  
  // 系统设置权限
  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',
  
  // 超级权限
  ALL: '*',
} as const;

export const ROLE_PERMISSIONS = {
  [USER_ROLES.SUPER_ADMIN]: [PERMISSIONS.ALL],
  [USER_ROLES.ADMIN]: [
    PERMISSIONS.USER_READ, PERMISSIONS.USER_WRITE,
    PERMISSIONS.ORDER_READ, PERMISSIONS.ORDER_WRITE,
    PERMISSIONS.SUBSCRIPTION_READ, PERMISSIONS.SUBSCRIPTION_WRITE,
    PERMISSIONS.ANALYTICS_READ,
    PERMISSIONS.SETTINGS_READ, PERMISSIONS.SETTINGS_WRITE,
  ],
  [USER_ROLES.OPERATOR]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.ORDER_READ, PERMISSIONS.ORDER_WRITE,
    PERMISSIONS.SUBSCRIPTION_READ, PERMISSIONS.SUBSCRIPTION_WRITE,
    PERMISSIONS.ANALYTICS_READ,
  ],
  [USER_ROLES.VIEWER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.ORDER_READ,
    PERMISSIONS.SUBSCRIPTION_READ,
    PERMISSIONS.ANALYTICS_READ,
  ],
} as const;

// ==================== 状态常量 ====================

export const USER_STATUS = {
  ACTIVE: 1,
  INACTIVE: 0,
} as const;

export const USER_STATUS_LABELS = {
  [USER_STATUS.ACTIVE]: '正常',
  [USER_STATUS.INACTIVE]: '禁用',
} as const;

export const USER_STATUS_COLORS = {
  [USER_STATUS.ACTIVE]: 'green',
  [USER_STATUS.INACTIVE]: 'red',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  EXPIRED: 'expired',
} as const;

export const ORDER_STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: '待支付',
  [ORDER_STATUS.PAID]: '已支付',
  [ORDER_STATUS.CANCELLED]: '已取消',
  [ORDER_STATUS.REFUNDED]: '已退款',
  [ORDER_STATUS.EXPIRED]: '已过期',
} as const;

export const ORDER_STATUS_COLORS = {
  [ORDER_STATUS.PENDING]: 'orange',
  [ORDER_STATUS.PAID]: 'green',
  [ORDER_STATUS.CANCELLED]: 'red',
  [ORDER_STATUS.REFUNDED]: 'purple',
  [ORDER_STATUS.EXPIRED]: 'gray',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export const PAYMENT_STATUS_LABELS = {
  [PAYMENT_STATUS.PENDING]: '待支付',
  [PAYMENT_STATUS.SUCCESS]: '支付成功',
  [PAYMENT_STATUS.FAILED]: '支付失败',
} as const;

export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
  NONE: 'none',
} as const;

export const SUBSCRIPTION_STATUS_LABELS = {
  [SUBSCRIPTION_STATUS.ACTIVE]: '活跃',
  [SUBSCRIPTION_STATUS.EXPIRED]: '已过期',
  [SUBSCRIPTION_STATUS.CANCELLED]: '已取消',
  [SUBSCRIPTION_STATUS.NONE]: '未订阅',
} as const;

export const SUBSCRIPTION_STATUS_COLORS = {
  [SUBSCRIPTION_STATUS.ACTIVE]: 'green',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'orange',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'red',
  [SUBSCRIPTION_STATUS.NONE]: 'gray',
} as const;

// ==================== 套餐类型常量 ====================

export const PLAN_TYPES = {
  MONTHLY: 'monthly',
  QUARTERLY: 'quarterly',
  YEARLY: 'yearly',
} as const;

export const PLAN_TYPE_LABELS = {
  [PLAN_TYPES.MONTHLY]: '月度套餐',
  [PLAN_TYPES.QUARTERLY]: '季度套餐',
  [PLAN_TYPES.YEARLY]: '年度套餐',
} as const;

export const PLAN_TYPE_COLORS = {
  [PLAN_TYPES.MONTHLY]: 'blue',
  [PLAN_TYPES.QUARTERLY]: 'green',
  [PLAN_TYPES.YEARLY]: 'gold',
} as const;

// ==================== 支付方式常量 ====================

export const PAYMENT_METHODS = {
  ALIPAY: 'alipay',
  WECHAT: 'wechat',
} as const;

export const PAYMENT_METHOD_LABELS = {
  [PAYMENT_METHODS.ALIPAY]: '支付宝',
  [PAYMENT_METHODS.WECHAT]: '微信支付',
} as const;

export const PAYMENT_METHOD_COLORS = {
  [PAYMENT_METHODS.ALIPAY]: 'blue',
  [PAYMENT_METHODS.WECHAT]: 'green',
} as const;

// ==================== 性别常量 ====================

export const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  UNKNOWN: 'unknown',
} as const;

export const GENDER_LABELS = {
  [GENDER.MALE]: '男',
  [GENDER.FEMALE]: '女',
  [GENDER.UNKNOWN]: '未知',
} as const;

// ==================== 文件上传常量 ====================

export const UPLOAD_CONFIG = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
} as const;

// ==================== 响应式断点常量 ====================

export const BREAKPOINTS = {
  XS: 480,
  SM: 576,
  MD: 768,
  LG: 992,
  XL: 1200,
  XXL: 1600,
} as const;

// ==================== 主题配置常量 ====================

export const THEME_CONFIG = {
  COLORS: {
    PRIMARY: '#1890ff',
    SUCCESS: '#52c41a',
    WARNING: '#faad14',
    ERROR: '#ff4d4f',
    INFO: '#1890ff',
  },
  BORDER_RADIUS: {
    SMALL: 4,
    DEFAULT: 6,
    LARGE: 8,
  },
} as const;

// ==================== 缓存键常量 ====================

export const CACHE_KEYS = {
  // 认证相关
  AUTH_TOKEN: 'admin_token',
  AUTH_USER: 'admin_user',
  
  // 主题设置
  THEME: 'theme',
  
  // 用户偏好
  SIDEBAR_COLLAPSED: 'sidebar_collapsed',
  REMEMBERED_USERNAME: 'remembered_username',
  TABLE_PAGE_SIZE: 'table_page_size',
  
  // 数据缓存
  DASHBOARD_STATS: 'dashboard_stats',
  USER_LIST: 'user_list',
  ORDER_LIST: 'order_list',
  
  // 筛选条件缓存
  USER_FILTERS: 'user_filters',
  ORDER_FILTERS: 'order_filters',
  SUBSCRIPTION_FILTERS: 'subscription_filters',
} as const;

// ==================== HTTP状态码常量 ====================

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

// ==================== 错误消息常量 ====================

export const ERROR_MESSAGES = {
  // 网络错误
  NETWORK_ERROR: '网络连接失败，请检查网络',
  TIMEOUT_ERROR: '请求超时，请稍后重试',
  SERVER_ERROR: '服务器内部错误',
  
  // 认证错误
  UNAUTHORIZED: '登录已过期，请重新登录',
  FORBIDDEN: '没有权限访问',
  LOGIN_FAILED: '用户名或密码错误',
  
  // 数据错误
  DATA_NOT_FOUND: '数据不存在',
  DATA_CONFLICT: '数据冲突，请刷新后重试',
  VALIDATION_ERROR: '数据验证失败',
  
  // 操作错误
  OPERATION_FAILED: '操作失败，请稍后重试',
  DELETE_FAILED: '删除失败',
  UPDATE_FAILED: '更新失败',
  CREATE_FAILED: '创建失败',
  
  // 文件上传错误
  FILE_TOO_LARGE: '文件大小超出限制',
  FILE_TYPE_NOT_ALLOWED: '文件类型不支持',
  UPLOAD_FAILED: '文件上传失败',
} as const;

// ==================== 成功消息常量 ====================

export const SUCCESS_MESSAGES = {
  // 通用操作
  OPERATION_SUCCESS: '操作成功',
  SAVE_SUCCESS: '保存成功',
  DELETE_SUCCESS: '删除成功',
  UPDATE_SUCCESS: '更新成功',
  CREATE_SUCCESS: '创建成功',
  
  // 认证相关
  LOGIN_SUCCESS: '登录成功',
  LOGOUT_SUCCESS: '退出成功',
  PASSWORD_RESET_SUCCESS: '密码重置成功',
  
  // 用户管理
  USER_CREATE_SUCCESS: '用户创建成功',
  USER_UPDATE_SUCCESS: '用户信息更新成功',
  USER_DELETE_SUCCESS: '用户删除成功',
  USER_STATUS_UPDATE_SUCCESS: '用户状态更新成功',
  
  // 订单管理
  ORDER_CONFIRM_SUCCESS: '订单确认成功',
  ORDER_CANCEL_SUCCESS: '订单取消成功',
  REFUND_SUCCESS: '退款申请提交成功',
  
  // 订阅管理
  SUBSCRIPTION_EXTEND_SUCCESS: '订阅延期成功',
  SUBSCRIPTION_CANCEL_SUCCESS: '订阅取消成功',
  
  // 文件上传
  UPLOAD_SUCCESS: '文件上传成功',
  EXPORT_SUCCESS: '数据导出成功',
} as const;

// ==================== 正则表达式常量 ====================

export const REGEX_PATTERNS = {
  // 基本格式验证
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^1[3-9]\d{9}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  
  // 身份证号
  ID_CARD: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
  
  // 银行卡号
  BANK_CARD: /^\d{16,19}$/,
  
  // IP地址
  IP_ADDRESS: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
  
  // URL
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,
  
  // 中文字符
  CHINESE: /[\u4e00-\u9fa5]/,
  
  // 数字和字母
  ALPHANUMERIC: /^[a-zA-Z0-9]+$/,
  
  // 金额（支持小数点后两位）
  MONEY: /^\d+(\.\d{1,2})?$/,
} as const;

// ==================== 时间格式常量 ====================

export const DATE_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm:ss',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  DATETIME_SHORT: 'MM-DD HH:mm',
  MONTH: 'YYYY-MM',
  YEAR: 'YYYY',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;

// ==================== 数据刷新间隔常量 ====================

export const REFRESH_INTERVALS = {
  REALTIME: 5000,    // 5秒 - 实时数据
  FREQUENT: 30000,   // 30秒 - 频繁更新数据
  NORMAL: 60000,     // 1分钟 - 普通数据
  SLOW: 300000,      // 5分钟 - 缓慢更新数据
} as const;

// ==================== 图表配置常量 ====================

export const CHART_CONFIG = {
  COLORS: [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#eb2f96', '#fa541c', '#a0d911', '#2f54eb'
  ],
  HEIGHT: {
    SMALL: 200,
    MEDIUM: 300,
    LARGE: 400,
    XLARGE: 500,
  },
  ANIMATION: {
    DURATION: 1000,
    EASING: 'easeInOutQuad',
  },
} as const;

// ==================== 表格配置常量 ====================

export const TABLE_CONFIG = {
  SIZES: {
    SMALL: 'small',
    MIDDLE: 'middle',
    LARGE: 'large',
  },
  SCROLL: {
    X: 1200,
    Y: 400,
  },
} as const;

// ==================== 导出格式常量 ====================

export const EXPORT_FORMATS = {
  EXCEL: 'excel',
  CSV: 'csv',
  PDF: 'pdf',
  IMAGE: 'image',
} as const;

export const EXPORT_FORMAT_LABELS = {
  [EXPORT_FORMATS.EXCEL]: 'Excel文件',
  [EXPORT_FORMATS.CSV]: 'CSV文件',
  [EXPORT_FORMATS.PDF]: 'PDF文件',
  [EXPORT_FORMATS.IMAGE]: '图片文件',
} as const;

// ==================== WebSocket事件常量 ====================

export const WS_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  
  // 业务事件
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
  ORDER_CREATED: 'order_created',
  ORDER_PAID: 'order_paid',
  STATS_UPDATE: 'stats_update',
  NOTIFICATION: 'notification',
} as const;

// ==================== 通知类型常量 ====================

export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

// ==================== 日志级别常量 ====================

export const LOG_LEVELS = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

// ==================== 环境变量常量 ====================

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000',
  WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || '自媒体管理后台',
  APP_VERSION: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
  PAGE_SIZE: parseInt(process.env.NEXT_PUBLIC_PAGE_SIZE || '20'),
  ENABLE_DEVTOOLS: process.env.NEXT_PUBLIC_ENABLE_DEVTOOLS === 'true',
} as const;

// ==================== 默认配置常量 ====================

export const DEFAULT_CONFIG = {
  // 分页配置
  PAGINATION: {
    current: PAGINATION_CONFIG.DEFAULT_PAGE,
    pageSize: PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number, range: [number, number]) =>
      `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
  },
  
  // 表格配置
  TABLE: {
    size: TABLE_CONFIG.SIZES.MIDDLE,
    scroll: { x: TABLE_CONFIG.SCROLL.X },
    rowKey: 'id',
  },
  
  // 图表配置
  CHART: {
    height: CHART_CONFIG.HEIGHT.MEDIUM,
    autoFit: true,
    padding: 'auto',
  },
  
  // 表单配置
  FORM: {
    layout: 'vertical' as const,
    size: 'large' as const,
    autoComplete: 'off' as const,
  },
} as const;

// ==================== 菜单配置常量 ====================

export const MENU_CONFIG = {
  COLLAPSED_WIDTH: 80,
  DEFAULT_WIDTH: 240,
  THEME: 'light' as const,
  MODE: 'inline' as const,
} as const;

// ==================== 类型导出 ====================

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type UserStatus = typeof USER_STATUS[keyof typeof USER_STATUS];
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];
export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS];
export type SubscriptionStatus = typeof SUBSCRIPTION_STATUS[keyof typeof SUBSCRIPTION_STATUS];
export type PlanType = typeof PLAN_TYPES[keyof typeof PLAN_TYPES];
export type PaymentMethod = typeof PAYMENT_METHODS[keyof typeof PAYMENT_METHODS];
export type Gender = typeof GENDER[keyof typeof GENDER];
export type ExportFormat = typeof EXPORT_FORMATS[keyof typeof EXPORT_FORMATS];
export type NotificationType = typeof NOTIFICATION_TYPES[keyof typeof NOTIFICATION_TYPES];
export type LogLevel = typeof LOG_LEVELS[keyof typeof LOG_LEVELS];