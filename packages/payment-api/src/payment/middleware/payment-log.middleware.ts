// src/payment/middleware/payment-log.middleware.ts
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PaymentLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PaymentLogMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, body, headers } = req;
    const userAgent = headers['user-agent'] || '';
    const ip = req.ip || req.connection.remoteAddress;

    // 记录请求日志（敏感信息脱敏）
    const logData = {
      method,
      url: originalUrl,
      userAgent,
      ip,
      body: this.sanitizeBody(body),
    };

    this.logger.log(`Payment Request: ${JSON.stringify(logData)}`);

    // 记录响应日志
    const originalSend = res.send;
    const self = this;
    res.send = function(body) {
      const responseBody = typeof body === 'string' ? body : JSON.stringify(body);
      self.logger.log(`Payment Response: ${responseBody.substring(0, 1000)}`);
      return originalSend.call(this, body);
    };

    next();
  }

  private sanitizeBody(body: any): any {
    if (!body) return body;
    
    const sanitized = { ...body };
    // 脱敏处理
    if (sanitized.password) sanitized.password = '***';
    if (sanitized.sign) sanitized.sign = '***';
    if (sanitized.api_key) sanitized.api_key = '***';
    
    return sanitized;
  }
}

// src/payment/interceptors/payment-response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';

@Injectable()
export class PaymentResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // 记录响应时间
        console.log(`Payment API ${request.method} ${request.url} - ${duration}ms`);
      }),
      map((data) => {
        // 统一响应格式
        if (data && typeof data === 'object' && !data.code) {
          return {
            code: 200,
            message: 'success',
            data,
            timestamp: new Date().toISOString(),
          };
        }
        return data;
      }),
    );
  }
}
