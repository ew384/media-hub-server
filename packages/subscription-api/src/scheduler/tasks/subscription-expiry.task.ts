// src/scheduler/tasks/subscription-expiry.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionService } from '../../subscription/subscription.service';
import { NotificationService } from '../../notification/notification.service';

@Injectable()
export class SubscriptionExpiryTask {
  private readonly logger = new Logger(SubscriptionExpiryTask.name);

  constructor(
    private subscriptionService: SubscriptionService,
    private notificationService: NotificationService,
  ) {}

  async execute() {
    this.logger.log('执行订阅过期检查任务');

    try {
      // 处理过期订阅
      const expiredCount = await this.subscriptionService.handleExpiredSubscriptions();
      
      // 发送提醒通知
      const expiringSubscriptions = await this.subscriptionService.getExpiringSubscriptions(1); // 明天过期
      
      for (const subscription of expiringSubscriptions) {
        await this.notificationService.sendUrgentExpiryReminder(subscription);
      }

      return {
        expiredCount,
        urgentReminders: expiringSubscriptions.length
      };

    } catch (error) {
      this.logger.error('订阅过期检查任务失败:', error);
      throw error;
    }
  }
}