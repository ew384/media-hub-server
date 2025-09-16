import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export const GetClientIp = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    
    // 优先获取真实IP
    const forwarded = request.headers['x-forwarded-for'] as string;
    const realIp = request.headers['x-real-ip'] as string;
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    if (realIp) {
      return realIp;
    }
    
    return request.ip || request.socket.remoteAddress || '127.0.0.1';
  },
);
