import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';

// 本地模块
import { PaymentModule } from './payment/payment.module';
import { AuthModule } from './auth/auth.module';     // 轻量级认证验证模块
import { CommonModule } from './common/common.module'; // 数据库、Redis、Email等

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      cache: true,
    }),

    // HTTP 客户端模块 (用于调用 auth-api)
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
      retries: 3,
    }),

    // 调度模块 (定时任务)
    ScheduleModule.forRoot(),

    // 队列模块 (支付回调处理)
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
      },
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
      },
    }),

    // 应用模块
    CommonModule,   // 基础设施模块
    AuthModule,     // 认证验证模块  
    PaymentModule,  // 支付核心模块
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
