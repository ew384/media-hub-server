import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SmsModule } from './sms/sms.module';
import { HealthModule } from './health/health.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // 限流模块 - 修复配置
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: 'short',
          ttl: 60 * 1000,   // 1分钟
          limit: 15,        // 最多15次请求
        },
        {
          name: 'medium', 
          ttl: 15 * 60 * 1000,  // 15分钟
          limit: 50,            // 最多50次请求
        },
        {
          name: 'long',
          ttl: 60 * 60 * 1000,  // 1小时
          limit: 100,           // 最多100次请求
        },
      ],
    }),

    // 缓存模块 (Redis)
    CacheModule.register({
      isGlobal: true,
      store: 'redis',
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB || '0'),
      ttl: 60 * 60, // 1小时默认过期时间(秒)
    }),

    // 业务模块
    PrismaModule,
    AuthModule,
    UsersModule,
    SmsModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}