import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class PaymentLogMiddleware implements NestMiddleware {
  private readonly logger = new Logger(PaymentLogMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const startTime = Date.now();

    // 记录请求信息
    this.logger.log(`${method} ${originalUrl} - ${ip} - ${userAgent}`);

    // 记录请求体（支付相关敏感信息需要脱敏）
    if (req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = this.sanitizeRequestBody(req.body);
      this.logger.debug(`Request Body: ${JSON.stringify(sanitizedBody)}`);
    }

    // 监听响应完成
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - startTime;

      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms`
      );
    });

    next();
  }

  private sanitizeRequestBody(body: any): any {
    const sensitiveFields = [
      'password',
      'token',
      'sign',
      'signature',
      'private_key',
      'secret',
    ];

    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }
}