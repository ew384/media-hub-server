// src/scheduler/scheduler.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SchedulerService } from './scheduler.service';
import { SubscriptionExpiryTask } from './tasks/subscription-expiry.task';
import { PermissionCacheTask } from './tasks/permission-cache.task';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SubscriptionModule,
    PermissionsModule,
    NotificationModule
  ],
  providers: [
    SchedulerService,
    SubscriptionExpiryTask,
    PermissionCacheTask
  ],
  exports: [SchedulerService]
})
export class SchedulerModule {}