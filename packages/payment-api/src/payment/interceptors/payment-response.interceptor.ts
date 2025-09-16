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
