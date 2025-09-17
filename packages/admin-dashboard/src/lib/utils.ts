import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import dayjs from 'dayjs';

// ==================== 样式工具函数 ====================

/**
 * 合并 Tailwind CSS 类名
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ==================== 数据格式化函数 ====================

/**
 * 格式化金额显示
 */
export const formatMoney = (amount: number, currency = 'CNY'): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

/**
 * 格式化数字显示（带千分位）
 */
export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
};

/**
 * 格式化百分比
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * 格式化文件大小
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// ==================== 时间处理函数 ====================

/**
 * 格式化日期时间
 */
export const formatDateTime = (date: string | Date, format = 'YYYY-MM-DD HH:mm:ss'): string => {
  return dayjs(date).format(format);
};

/**
 * 格式化相对时间
 */
export const formatRelativeTime = (date: string | Date): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diffInMinutes = now.diff(target, 'minute');
  
  if (diffInMinutes < 1) return '刚刚';
  if (diffInMinutes < 60) return `${diffInMinutes}分钟前`;
  
  const diffInHours = now.diff(target, 'hour');
  if (diffInHours < 24) return `${diffInHours}小时前`;
  
  const diffInDays = now.diff(target, 'day');
  if (diffInDays < 7) return `${diffInDays}天前`;
  
  return target.format('YYYY-MM-DD');
};

/**
 * 获取时间范围
 */
export const getDateRange = (days: number): [string, string] => {
  const end = dayjs();
  const start = end.subtract(days, 'day');
  return [start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD')];
};

/**
 * 判断是否为今天
 */
export const isToday = (date: string | Date): boolean => {
  return dayjs(date).isSame(dayjs(), 'day');
};

// ==================== 字符串处理函数 ====================

/**
 * 截断文本
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * 生成随机字符串
 */
export const generateRandomString = (length: number): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * 驼峰转短横线
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
};

/**
 * 短横线转驼峰
 */
export const kebabToCamel = (str: string): string => {
  return str.replace(/-([a-z])/g, (match, letter) => letter.toUpperCase());
};

// ==================== 数组处理函数 ====================

/**
 * 数组去重
 */
export const uniqueArray = <T>(array: T[], key?: keyof T): T[] => {
  if (!key) {
    return [...new Set(array)];
  }
  
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * 数组分组
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

/**
 * 数组分页
 */
export const paginate = <T>(array: T[], page: number, pageSize: number): T[] => {
  const startIndex = (page - 1) * pageSize;
  return array.slice(startIndex, startIndex + pageSize);
};

// ==================== 对象处理函数 ====================

/**
 * 深度克隆对象
 */
export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * 移除对象中的空值
 */
export const removeEmptyValues = (obj: Record<string, any>): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    const value = obj[key];
    if (value !== null && value !== undefined && value !== '') {
      result[key] = value;
    }
  }
  
  return result;
};

/**
 * 对象属性重命名
 */
export const renameKeys = (obj: Record<string, any>, keyMap: Record<string, string>): Record<string, any> => {
  const result: Record<string, any> = {};
  
  for (const key in obj) {
    const newKey = keyMap[key] || key;
    result[newKey] = obj[key];
  }
  
  return result;
};

// ==================== 验证函数 ====================

/**
 * 验证邮箱格式
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * 验证手机号格式
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 验证身份证号格式
 */
export const isValidIdCard = (idCard: string): boolean => {
  const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
  return idCardRegex.test(idCard);
};

/**
 * 验证URL格式
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// ==================== 本地存储函数 ====================

/**
 * 安全的localStorage操作
 */
export const storage = {
  get: (key: string, defaultValue: any = null) => {
    if (typeof window === 'undefined') return defaultValue;
    
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set: (key: string, value: any) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  
  remove: (key: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  },
  
  clear: () => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  },
};

// ==================== 防抖和节流函数 ====================

/**
 * 防抖函数
 */
export const debounce = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

/**
 * 节流函数
 */
export const throttle = <T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void => {
  let lastExecTime = 0;
  
  return (...args: Parameters<T>) => {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime >= delay) {
      func(...args);
      lastExecTime = currentTime;
    }
  };
};

// ==================== 错误处理函数 ====================

/**
 * 安全的异步函数执行
 */
export const safeAsync = async <T>(
  asyncFn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> => {
  try {
    return await asyncFn();
  } catch (error) {
    console.error('Async function error:', error);
    return fallback;
  }
};

/**
 * 重试函数
 */
export const retry = async <T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
};

// ==================== 导出所有工具函数 ====================

export default {
  cn,
  formatMoney,
  formatNumber,
  formatPercentage,
  formatFileSize,
  formatDateTime,
  formatRelativeTime,
  getDateRange,
  isToday,
  truncateText,
  generateRandomString,
  camelToKebab,
  kebabToCamel,
  uniqueArray,
  groupBy,
  paginate,
  deepClone,
  removeEmptyValues,
  renameKeys,
  isValidEmail,
  isValidPhone,
  isValidIdCard,
  isValidUrl,
  storage,
  debounce,
  throttle,
  safeAsync,
  retry,
};