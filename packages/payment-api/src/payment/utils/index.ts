// packages/payment-api/src/payment/utils/index.ts
import * as crypto from 'crypto';
import * as moment from 'moment';

/**
 * 生成订单号
 * 格式：yyyyMMddHHmmss + 8位随机数
 */
export function generateOrderNo(): string {
  const timestamp = moment().format('YYYYMMDDHHmmss');
  const random = Math.random().toString().slice(2, 10);
  return `${timestamp}${random}`;
}

/**
 * 生成退款单号
 * 格式：R + yyyyMMddHHmmss + 8位随机数
 */
export function generateRefundNo(): string {
  const timestamp = moment().format('YYYYMMDDHHmmss');
  const random = Math.random().toString().slice(2, 10);
  return `R${timestamp}${random}`;
}

/**
 * 生成随机字符串
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * 金额转换：元转分
 */
export function yuanToFen(yuan: number): number {
  return Math.round(yuan * 100);
}

/**
 * 金额转换：分转元
 */
export function fenToYuan(fen: number): number {
  return Math.round(fen) / 100;
}

/**
 * 格式化金额显示
 */
export function formatAmount(amount: number): string {
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/**
 * 验证订单号格式
 */
export function validateOrderNo(orderNo: string): boolean {
  // 基础格式验证：22位数字
  const pattern = /^\d{22}$/;
  return pattern.test(orderNo);
}

/**
 * 验证退款单号格式
 */
export function validateRefundNo(refundNo: string): boolean {
  // 基础格式验证：R + 22位数字
  const pattern = /^R\d{22}$/;
  return pattern.test(refundNo);
}

/**
 * 计算订单过期时间
 */
export function calculateExpireTime(minutes: number = 15): Date {
  return moment().add(minutes, 'minutes').toDate();
}

/**
 * 检查订单是否过期
 */
export function isOrderExpired(expiresAt: Date): boolean {
  return moment().isAfter(moment(expiresAt));
}

/**
 * 生成支付回调验证签名
 */
export function generateCallbackSign(params: Record<string, any>, key: string): string {
  const sortedKeys = Object.keys(params).sort();
  const stringA = sortedKeys
    .filter(k => params[k] !== undefined && params[k] !== '' && k !== 'sign')
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  const stringSignTemp = `${stringA}&key=${key}`;
  return crypto.createHash('md5').update(stringSignTemp, 'utf8').digest('hex').toUpperCase();
}
