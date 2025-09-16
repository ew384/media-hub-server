// src/notification/notification.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import { DatabaseService } from '../database/database.service';
import { ExpiringSubscription, SubscriptionStats } from '../subscription/interfaces/subscription.interface';

interface ExpiryReminderData {
  userId: number;
  email: string;
  planName: string;
  endDate: Date;
  remainingDays: number;
}

interface WeeklyReportData {
  stats: SubscriptionStats;
  expiringCount: number;
  timestamp: Date;
}

interface NotificationRecord {
  userId: number;
  type: string;
  content: string;
  channel: string;
  status: string;
  referenceId?: string;
  sentAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly db: DatabaseService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  /**
   * 发送会员到期提醒
   */
  async sendExpiryReminder(data: ExpiryReminderData): Promise<void> {
    try {
      const subject = `【重要提醒】您的${data.planName}即将到期`;
      const template = this.getExpiryReminderTemplate(data);

      await this.mailerService.sendMail({
        to: data.email,
        subject,
        html: template,
        template: 'expiry-reminder', // 邮件模板名称
        context: {
          planName: data.planName,
          endDate: data.endDate.toLocaleDateString('zh-CN'),
          remainingDays: data.remainingDays,
          renewUrl: `${this.configService.get('FRONTEND_URL')}/subscription/renew`
        }
      });

      // 记录通知
      await this.recordNotification(data.userId, 'expiry_reminder', subject);

      this.logger.log(`发送到期提醒邮件成功 - 用户 ${data.userId}`);

    } catch (error) {
      this.logger.error(`发送到期提醒邮件失败 - 用户 ${data.userId}:`, error);
      throw error;
    }
  }

  /**
   * 发送紧急到期提醒（24小时内到期）
   */
  async sendUrgentExpiryReminder(subscription: ExpiringSubscription): Promise<void> {
    try {
      const subject = `🚨 紧急提醒：您的${subscription.planName}将在24小时内到期`;
      
      await this.mailerService.sendMail({
        to: subscription.userEmail,
        subject,
        template: 'urgent-expiry-reminder',
        context: {
          planName: subscription.planName,
          endDate: subscription.endDate.toLocaleDateString('zh-CN'),
          remainingHours: Math.ceil(subscription.remainingDays * 24),
          renewUrl: `${this.configService.get('FRONTEND_URL')}/subscription/renew`,
          contactUrl: `${this.configService.get('FRONTEND_URL')}/contact`
        }
      });

      await this.recordNotification(subscription.userId, 'urgent_expiry_reminder', subject, 'email', subscription.id.toString());

      this.logger.log(`发送紧急到期提醒成功 - 用户 ${subscription.userId}`);

    } catch (error) {
      this.logger.error(`发送紧急到期提醒失败 - 用户 ${subscription.userId}:`, error);
      throw error;
    }
  }

  /**
   * 发送订阅成功通知
   */
  async sendSubscriptionSuccessNotification(userId: number, email: string, planName: string, endDate: Date): Promise<void> {
    try {
      const subject = `🎉 订阅成功！欢迎使用${planName}`;
      
      await this.mailerService.sendMail({
        to: email,
        subject,
        template: 'subscription-success',
        context: {
          planName,
          endDate: endDate.toLocaleDateString('zh-CN'),
          dashboardUrl: `${this.configService.get('FRONTEND_URL')}/dashboard`,
          supportUrl: `${this.configService.get('FRONTEND_URL')}/support`
        }
      });

      // 记录通知
      await this.recordNotification(userId, 'subscription_success', subject);

      this.logger.log(`发送订阅成功通知 - 用户 ${userId}`);

    } catch (error) {
      this.logger.error(`发送订阅成功通知失败 - 用户 ${userId}:`, error);
      throw error;
    }
  }

  /**
   * 发送周报给管理员
   */
  async sendWeeklyReport(data: WeeklyReportData): Promise<void> {
    try {
      const adminEmails = this.configService.get<string>('ADMIN_EMAILS', '').split(',');
      
      if (adminEmails.length === 0) {
        this.logger.warn('未配置管理员邮箱，跳过周报发送');
        return;
      }

      const subject = `📊 会员系统周报 - ${data.timestamp.toLocaleDateString('zh-CN')}`;
      
      for (const email of adminEmails) {
        await this.mailerService.sendMail({
          to: email.trim(),
          subject,
          template: 'weekly-report',
          context: {
            totalActive: data.stats.totalActiveSubscriptions,
            totalExpired: data.stats.totalExpiredSubscriptions,
            monthlyRevenue: data.stats.monthlyRevenue.toFixed(2),
            expiringCount: data.expiringCount,
            autoRenewRate: data.stats.autoRenewRate.toFixed(1),
            planDistribution: data.stats.planDistribution,
            reportDate: data.timestamp.toLocaleDateString('zh-CN')
          }
        });
      }

      this.logger.log('周报发送完成');

    } catch (error) {
      this.logger.error('发送周报失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否已发送提醒（基于时间的简单检查，因为没有专门的通知记录表）
   */
  async checkReminderSent(userId: number, subscriptionId: number, type: string): Promise<boolean> {
    // 由于原 schema 没有通知记录表，我们使用简单的时间检查
    // 这里可以后续优化，添加专门的通知记录表
    return false; // 暂时总是允许发送
  }

  /**
   * 标记提醒已发送
   */
  async markReminderSent(userId: number, subscriptionId: number, type: string): Promise<void> {
    await this.recordNotification(
      userId,
      type,
      `提醒已发送: ${type}`,
      'email',
      subscriptionId.toString()
    );
  }

  /**
   * 获取用户的通知历史
   */
  async getUserNotifications(userId: number, page: number = 1, limit: number = 20) {
    // 由于没有专门的通知表，这里返回空数组
    // 后续可以考虑添加通知记录表到 schema 中
    return {
      notifications: [],
      total: 0,
      page,
      limit
    };
  }

  /**
   * 记录通知（存储到日志或简单记录）
   */
  private async recordNotification(
    userId: number, 
    type: string, 
    content: string, 
    channel: string = 'email',
    referenceId?: string
  ): Promise<void> {
    try {
      // 由于原 schema 中没有 notification_records 表
      // 这里只做日志记录，后续可以添加表结构
      const record: NotificationRecord = {
        userId,
        type,
        content,
        channel,
        status: 'sent',
        referenceId,
        sentAt: new Date()
      };

      this.logger.log(`Notification recorded: ${JSON.stringify(record)}`);
    } catch (error) {
      this.logger.error('记录通知失败:', error);
    }
  }

  /**
   * 获取到期提醒邮件模板
   */
  private getExpiryReminderTemplate(data: ExpiryReminderData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>会员到期提醒</title>
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8f9fa; }
          .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>会员到期提醒</h1>
          </div>
          <div class="content">
            <p>亲爱的用户，</p>
            <div class="warning">
              <strong>⚠️ 重要提醒</strong><br>
              您的 <strong>${data.planName}</strong> 将在 <strong>${data.remainingDays}</strong> 天后到期。<br>
              到期时间：${data.endDate.toLocaleDateString('zh-CN')}
            </div>
            <p>为了不影响您的正常使用，请及时续费：</p>
            <a href="${this.configService.get('FRONTEND_URL')}/subscription/renew" class="button">立即续费</a>
            <p>如有任何问题，请随时联系我们的客服团队。</p>
          </div>
          <div class="footer">
            <p>此邮件由系统自动发送，请勿回复</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}