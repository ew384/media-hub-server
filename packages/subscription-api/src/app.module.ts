// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { PermissionsModule } from './permissions/permissions.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { NotificationModule } from './notification/notification.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DatabaseModule,
    AuthModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          store: 'redis',
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6380')),
          password: configService.get('REDIS_PASSWORD') || undefined,
          db: parseInt(configService.get('REDIS_DB', '0')),
          ttl: parseInt(configService.get('PERMISSION_CACHE_TTL', '21600')),
        };
      },
      inject: [ConfigService],
      isGlobal: true,
    }),
    SubscriptionModule,
    PermissionsModule,
    SchedulerModule,
    NotificationModule,
    AdminModule,
  ],
})
export class AppModule {}