// src/payment/payment.module.ts
import { Module, MiddlewareConsumer } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

import { PaymentController } from './controllers/payment.controller';
import { AdminPaymentController } from './controllers/admin-payment.controller';
import { PaymentService } from './services/payment.service';
import { AlipayService } from './services/alipay.service';
import { WechatPayService } from './services/wechat-pay.service';
import { QueueService } from './services/queue.service';
import { NotificationService } from './services/notification.service';
import { PaymentProcessor } from './processors/payment.processor';
import { PaymentTask } from './tasks/payment.task';

import { PaymentLogMiddleware } from './middleware/payment-log.middleware';
import { PaymentResponseInterceptor } from './interceptors/payment-response.interceptor';
import { PaymentExceptionFilter } from './filters/payment-exception.filter';

import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    EmailModule,
    ScheduleModule.forRoot(),
    BullModule.registerQueue({
      name: 'payment',
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
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
