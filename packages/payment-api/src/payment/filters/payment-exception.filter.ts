// src/payment/filters/payment-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class PaymentExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PaymentExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = '服务器内部错误';
    let code = 500;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const errorResponse = exception.getResponse();
      
      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else if (typeof errorResponse === 'object') {
        message = (errorResponse as any).message || '请求失败';
      }
      
      code = status;
    }

    // 记录错误日志
    this.logger.error(
      `Payment Error: ${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // 支付相关特殊错误处理
    if (message.includes('支付')) {
      code = 4001; // 支付错误码
    } else if (message.includes('订单')) {
      code = 4002; // 订单错误码
    } else if (message.includes('退款')) {
      code = 4003; // 退款错误码
    }

    response.status(status).json({
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
