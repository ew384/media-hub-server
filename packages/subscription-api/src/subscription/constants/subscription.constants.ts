// src/subscription/constants/subscription.constants.ts

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  duration: number;
  unit: 'month' | 'year';
  discount: number;
  features: string[];
  isPopular?: boolean;
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  monthly: {
    id: 'monthly',
    name: '包月套餐',
    price: 49.9,
    duration: 1,
    unit: 'month',
    discount: 0,
    features: ['发布功能', '聚合功能', '客服支持'],
    isPopular: false
  },
  quarterly: {
    id: 'quarterly',
    name: '包季套餐',
    price: 129,
    duration: 3,
    unit: 'month',
    discount: 13.7,
    features: ['发布功能', '聚合功能', '客服支持', '优先支持'],
    isPopular: true
  },
  yearly: {
    id: 'yearly',
    name: '包年套餐',
    price: 459,
    duration: 12,
    unit: 'month',
    discount: 23.8,
    features: ['发布功能', '聚合功能', '客服支持', '优先支持', 'VIP群'],
    isPopular: false
  }
};

export enum SubscriptionStatus {
  ACTIVE = 1,
  EXPIRED = 0,
  CANCELLED = -1,
  SUSPENDED = 2
}

export interface FeatureConfig {
  name: string;
  description: string;
  requiredPlans: string[];
  limits?: Record<string, number | string>;
}

export const FEATURES: Record<string, FeatureConfig> = {
  'publish': {
    name: '内容发布',
    description: '支持多平台内容发布',
    requiredPlans: ['monthly', 'quarterly', 'yearly'],
    limits: {
      monthly: 100,
      quarterly: 500,
      yearly: -1 // 无限制
    }
  },
  'aggregate': {
    name: '消息聚合',
    description: '聚合多平台私信和评论',
    requiredPlans: ['monthly', 'quarterly', 'yearly']
  },
  'customer_support': {
    name: '客服支持',
    description: '基础客服支持',
    requiredPlans: ['monthly', 'quarterly', 'yearly']
  },
  'priority_support': {
    name: '优先客服',
    description: '享受优先客服支持',
    requiredPlans: ['quarterly', 'yearly']
  },
  'vip_group': {
    name: 'VIP交流群',
    description: '加入VIP用户交流群',
    requiredPlans: ['yearly']
  }
};

export const PERMISSION_ACTIONS = {
  RENEW: 'renew',
  UPGRADE: 'upgrade',
  CONTACT: 'contact'
} as const;

export const CACHE_KEYS = {
  USER_PERMISSIONS: 'perm:user:',
  SUBSCRIPTION_STATUS: 'sub:status:',
  PLAN_FEATURES: 'plan:features:'
} as const;