// packages/payment-api/src/payment/payment.module.ts
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { PaymentController } from './controllers/payment.controller';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { PaymentService } from './payment.service';
import { AlipayService } from './services/alipay.service';
import { WechatPayService } from './services/wechat-pay.service';
import { QueueService } from './services/queue.service';
import { NotificationService } from './services/notification.service';
import { PaymentProcessor } from './processors/payment.processor';
import { PaymentTask } from './tasks/payment.task';

import { PaymentLogMiddleware } from './middleware/payment-log.middleware';
import { PaymentResponseInterceptor } from './interceptors/payment-response.interceptor';
import { PaymentExceptionFilter } from './filters/payment-exception.filter';

import { CommonModule } from '../common/common.module';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    CommonModule,
    EmailModule,
    AuthModule, // 添加这个导入
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'payment',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6380,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
  ],
  controllers: [PaymentController, AdminPaymentController],
  providers: [
    PaymentService,
    AlipayService,
    WechatPayService,
    QueueService,
    NotificationService,
    PaymentProcessor,
    PaymentTask,
    {
      provide: APP_INTERCEPTOR,
      useClass: PaymentResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: PaymentExceptionFilter,
    },
  ],
  exports: [PaymentService],
})
export class PaymentModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PaymentLogMiddleware)
      .forRoutes('payment/*', 'admin/payment/*');
  }
}