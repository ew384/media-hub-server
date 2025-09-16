import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Request } from 'express';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 公开接口装饰器（跳过JWT验证）
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/**
 * 获取当前用户装饰器
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * 获取客户端IP装饰器
 */
export const GetClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request: Request = ctx.switchToHttp().getRequest();
    
    // 优先从代理头获取真实IP
    const forwarded = request.headers['x-forwarded-for'] as string;
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    const realIp = request.headers['x-real-ip'] as string;
    if (realIp) {
      return realIp;
    }
    
    // 从连接信息获取IP
    return request.connection?.remoteAddress || 
           request.socket?.remoteAddress || 
           (request.connection as any)?.socket?.remoteAddress ||
           '127.0.0.1';
  },
);