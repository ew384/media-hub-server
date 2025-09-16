// src/scheduler/scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from '../subscription/subscription.service';
import { PermissionsService } from '../permissions/permissions.service';
import { NotificationService } from '../notification/notification.service'; // 需要创建通知服务

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);
  private readonly isScheduleEnabled: boolean;

  constructor(
    private configService: ConfigService,
    private subscriptionService: SubscriptionService,
    private permissionsService: PermissionsService,
    private notificationService: NotificationService,
  ) {
    this.isScheduleEnabled = this.configService.get<boolean>('SCHEDULE_ENABLED', true);
  }

  /**
   * 每小时检查过期订阅
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleSubscriptionExpiry() {
    if (!this.isScheduleEnabled) {
      this.logger.debug('定时任务已禁用，跳过订阅过期检查');
      return;
    }

    this.logger.log('开始执行订阅过期检查任务');

    try {
      // 处理已过期的订阅
      const expiredCount = await this.subscriptionService.handleExpiredSubscriptions();
      this.logger.log(`处理了 ${expiredCount} 个过期订阅`);

      // 发送到期提醒
      await this.sendExpiryReminders();

    } catch (error) {
      this.logger.error('订阅过期检查任务执行失败:', error);
    }
  }

  /**
   * 每6小时刷新权限缓存
   */
  @Cron('0 */6 * * *')
  async refreshPermissionsCache() {
    if (!this.isScheduleEnabled) {
      this.logger.debug('定时任务已禁用，跳过权限缓存刷新');
      return;
    }

    this.logger.log('开始执行权限缓存刷新任务');

    try {
      const refreshedCount = await this.permissionsService.refreshAllPermissionsCache();
      this.logger.log(`刷新了 ${refreshedCount} 个用户的权限缓存`);

      // 清理过期的权限记录
      await this.permissionsService.cleanupExpiredPermissions();

    } catch (error) {
      this.logger.error('权限缓存刷新任务执行失败:', error);
    }
  }

  /**
   * 每天凌晨执行数据清理任务
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyCleanupTasks() {
    if (!this.isScheduleEnabled) {
      this.logger.debug('定时任务已禁用，跳过每日清理任务');
      return;
    }

    this.logger.log('开始执行每日清理任务');

    try {
      // 清理过期的权限缓存记录
      await this.permissionsService.cleanupExpiredPermissions();

      // 清理其他过期数据（验证码、会话等）
      await this.cleanupExpiredData();

      // 生成每日统计报告
      await this.generateDailyReport();

      this.logger.log('每日清理任务执行完成');

    } catch (error) {
      this.logger.error('每日清理任务执行失败:', error);
    }
  }

  /**
   * 每周一上午9点发送运营报告
   */
  @Cron('0 9 * * 1')
  async sendWeeklyReport() {
    if (!this.isScheduleEnabled) {
      this.logger.debug('定时任务已禁用，跳过周报发送');
      return;
    }

    this.logger.log('开始发送周报');

    try {
      const stats = await this.subscriptionService.getSubscriptionStats();
      const expiringSubscriptions = await this.subscriptionService.getExpiringSubscriptions(7);

      await this.notificationService.sendWeeklyReport({
        stats,
        expiringCount: expiringSubscriptions.length,
        timestamp: new Date()
      });

      this.logger.log('周报发送完成');

    } catch (error) {
      this.logger.error('周报发送失败:', error);
    }
  }

  /**
   * 发送到期提醒
   */
  private async sendExpiryReminders() {
    const remindDays = this.configService.get<number>('SUBSCRIPTION_REMIND_DAYS', 7);
    const expiringSubscriptions = await this.subscriptionService.getExpiringSubscriptions(remindDays);

    for (const subscription of expiringSubscriptions) {
      try {
        // 检查是否已经发送过提醒（避免重复发送）
        const reminderSent = await this.notificationService.checkReminderSent(
          subscription.userId, 
          subscription.id,
          'expiry_reminder'
        );

        if (!reminderSent) {
          await this.notificationService.sendExpiryReminder({
            userId: subscription.userId,
            email: subscription.userEmail,
            planName: subscription.planName,
            endDate: subscription.endDate,
            remainingDays: subscription.remainingDays
          });

          // 标记提醒已发送
          await this.notificationService.markReminderSent(
            subscription.userId,
            subscription.id,
            'expiry_reminder'
          );
        }
      } catch (error) {
        this.logger.error(`发送到期提醒失败 - 用户 ${subscription.userId}:`, error);
      }
    }

    this.logger.log(`发送了 ${expiringSubscriptions.length} 个到期提醒`);
  }

  /**
   * 清理过期数据
   */
  private async cleanupExpiredData() {
    // 这里可以清理各种过期数据
    // 例如：验证码、重置密码令牌、临时文件等
    this.logger.log('清理过期数据完成');
  }

  /**
   * 生成每日统计报告
   */
  private async generateDailyReport() {
    try {
      const stats = await this.subscriptionService.getSubscriptionStats();
      
      // 保存统计数据到数据库或发送给管理员
      this.logger.log('每日统计报告生成完成', {
        activeSubscriptions: stats.totalActiveSubscriptions,
        monthlyRevenue: stats.monthlyRevenue,
        expiringInWeek: stats.expiringInWeek
      });

    } catch (error) {
      this.logger.error('生成每日报告失败:', error);
    }
  }
}