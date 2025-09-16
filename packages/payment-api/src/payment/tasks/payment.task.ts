// src/payment/tasks/payment.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../services/payment.service';
import { NotificationService } from '../services/notification.service';
import { PAYMENT_STATUS } from '../constants';

@Injectable()
export class PaymentTask {
  private readonly logger = new Logger(PaymentTask.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private notificationService: NotificationService,
  ) {}

  // 每分钟检查过期订单
  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    this.logger.log('开始检查过期订单...');
    
    try {
      const expiredOrders = await this.prisma.order.findMany({
        where: {
          paymentStatus: PAYMENT_STATUS.PENDING,
          expiresAt: {
            lt: new Date(),
          },
        },
        select: {
          orderNo: true,
        },
      });

      for (const order of expiredOrders) {
        await this.paymentService.expireOrder(order.orderNo);
        // 发送过期通知
        await this.notificationService.sendOrderExpiredNotification(order.orderNo);
        this.logger.log(`订单 ${order.orderNo} 已过期`);
      }

      this.logger.log(`处理了 ${expiredOrders.length} 个过期订单`);
    } catch (error) {
      this.logger.error('检查过期订单失败:', error);
    }
  }

  // 每小时清理过期的回调记录
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldCallbacks() {
    this.logger.log('开始清理过期回调记录...');
    
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await this.prisma.paymentCallback.deleteMany({
        where: {
          createdAt: {
            lt: sevenDaysAgo,
          },
          status: 1, // 只删除已处理的记录
        },
      });

      this.logger.log(`清理了 ${result.count} 条过期回调记录`);
    } catch (error) {
      this.logger.error('清理回调记录失败:', error);
    }
  }

  // 每天生成支付统计报告
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async generateDailyReport() {
    this.logger.log('开始生成每日支付统计报告...');
    
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await this.prisma.order.aggregate({
        where: {
          paymentStatus: PAYMENT_STATUS.PAID,
          paidAt: {
            gte: yesterday,
            lt: today,
          },
        },
        _sum: {
          finalAmount: true,
        },
        _count: {
          id: true,
        },
      });

      const reportData = {
        date: yesterday.toISOString().split('T')[0],
        totalRevenue: stats._sum.finalAmount || 0,
        orderCount: stats._count.id || 0,
      };

      this.logger.log(`每日统计报告: ${JSON.stringify(reportData)}`);
      
      // 保存到统计表
      await this.prisma.dailyStats.create({
        data: {
          date: yesterday,
          revenue: reportData.totalRevenue,
          orderCount: reportData.orderCount,
          type: 'payment',
        },
      });
      
    } catch (error) {
      this.logger.error('生成每日报告失败:', error);
    }
  }

  // 每周检查订阅即将过期的用户
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async checkExpiringSubscriptions() {
    this.logger.log('开始检查即将过期的订阅...');
    
    try {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);

      const expiringSubscriptions = await this.prisma.subscription.findMany({
        where: {
          status: 1, // 活跃订阅
          endDate: {
            lte: threeDaysLater,
            gte: new Date(),
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      });

      for (const subscription of expiringSubscriptions) {
        await this.sendRenewalReminder(subscription);
      }

      this.logger.log(`发送了 ${expiringSubscriptions.length} 条续费提醒`);
    } catch (error) {
      this.logger.error('检查即将过期的订阅失败:', error);
    }
  }

  private async sendRenewalReminder(subscription: any) {
    // 发送续费提醒邮件
    const { user, endDate, planId } = subscription;
    const planInfo = SUBSCRIPTION_PLANS[planId];
    
    await this.notificationService.emailService.sendEmail({
      to: user.email,
      subject: '订阅即将过期提醒',
      template: 'renewal-reminder',
      context: {
        username: user.username,
        planName: planInfo?.name || '套餐',
        endDate: endDate.toLocaleDateString(),
      },
    });

    this.logger.log(`发送续费提醒给用户: ${user.email}`);
  }
}
