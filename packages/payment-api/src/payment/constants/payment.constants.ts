// src/payment/constants/payment.constants.ts
export const PAYMENT_STATUS = {
  PENDING: 0,     // 待支付
  PAID: 1,        // 已支付
  REFUNDED: 2,    // 已退款
  CANCELLED: 3,   // 已取消
  EXPIRED: 4,     // 已过期
} as const;

export const PAYMENT_METHOD = {
  ALIPAY: 'alipay',
  WECHAT: 'wechat',
} as const;

export const REFUND_STATUS = {
  PENDING: 0,     // 申请中
  SUCCESS: 1,     // 退款成功
  FAILED: 2,      // 退款失败
} as const;

export const SUBSCRIPTION_PLANS = {
  monthly: { price: 49.9, duration: 1, name: '包月套餐' },
  quarterly: { price: 129, duration: 3, name: '包季套餐' },
  yearly: { price: 459, duration: 12, name: '包年套餐' },
} as const;

export const ORDER_EXPIRE_MINUTES = 15; // 订单15分钟过期
