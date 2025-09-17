import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../common/database/prisma.service';
import { PaymentService } from '../payment.service';
import { NotificationService } from '../services/notification.service';
import { PAYMENT_STATUS, SUBSCRIPTION_PLANS } from '../constants/payment.constants';

@Injectable()
export class PaymentTask {
  private readonly logger = new Logger(PaymentTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  // 每5分钟检查一次过期订单
  @Cron('0 */5 * * * *')
  async handleExpiredOrders() {
    try {
      this.logger.debug('开始检查过期订单...');

      const expiredOrders = await this.prisma.order.findMany({
        where: {
          paymentStatus: PAYMENT_STATUS.PENDING,
          expiresAt: {
            lt: new Date(),
          },
        },
        select: { orderNo: true },
      });

      if (expiredOrders.length === 0) {
        this.logger.debug('没有发现过期订单');
        return;
      }

      for (const order of expiredOrders) {
        try {
          await this.paymentService.expireOrder(order.orderNo);
          this.logger.log(`订单已过期: ${order.orderNo}`);
        } catch (error) {
          this.logger.error(`处理过期订单失败: ${order.orderNo}`, error.stack);
        }
      }

      this.logger.log(`过期订单处理完成，共处理 ${expiredOrders.length} 个订单`);
    } catch (error) {
      this.logger.error('检查过期订单失败', error.stack);
    }
  }

  // 每天凌晨1点执行数据清理
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDataCleanup() {
    try {
      this.logger.log('开始执行数据清理任务...');

      // 清理30天前的支付回调记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const deletedCallbacks = await this.prisma.paymentCallback.deleteMany({
        where: {
          createdAt: {
            lt: thirtyDaysAgo,
          },
          status: 1, // 只删除已处理的回调
        },
      });

      this.logger.log(`清理了 ${deletedCallbacks.count} 条支付回调记录`);

      // 清理过期的Redis缓存键（如果需要的话）
      // await this.cleanupRedisCache();

      this.logger.log('数据清理任务完成');
    } catch (error) {
      this.logger.error('数据清理任务失败', error.stack);
    }
  }

  // 每天早上9点发送支付统计报告
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async handleDailyReport() {
    try {
      this.logger.log('开始生成日报...');

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 统计昨天的支付数据
      const [totalOrders, successfulOrders, totalAmount] = await Promise.all([
        this.prisma.order.count({
          where: {
            createdAt: {
              gte: yesterday,
              lt: today,
            },
          },
        }),
        this.prisma.order.count({
          where: {
            paymentStatus: PAYMENT_STATUS.PAID,
            paidAt: {
              gte: yesterday,
              lt: today,
            },
          },
        }),
        this.prisma.order.aggregate({
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
        }),
      ]);

      const successRate = totalOrders > 0 ? (successfulOrders / totalOrders * 100).toFixed(2) : '0';
      const revenue = totalAmount._sum.finalAmount || 0;

      this.logger.log(
        `昨日支付统计 - 总订单: ${totalOrders}, 成功订单: ${successfulOrders}, ` +
        `成功率: ${successRate}%, 总收入: ¥${revenue}`
      );

      // 这里可以发送邮件通知给管理员
      // await this.sendDailyReportEmail({
      //   totalOrders,
      //   successfulOrders,
      //   successRate: parseFloat(successRate),
      //   revenue: parseFloat(revenue.toString()),
      // });

    } catch (error) {
      this.logger.error('生成日报失败', error.stack);
    }
  }

  // 每小时检查支付状态同步
  @Cron(CronExpression.EVERY_HOUR)
  async handlePaymentStatusSync() {
    try {
      this.logger.debug('开始同步支付状态...');

      // 查找1小时内创建但仍然是待支付状态的订单
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const pendingOrders = await this.prisma.order.findMany({
        where: {
          paymentStatus: PAYMENT_STATUS.PENDING,
          createdAt: {
            gte: oneHourAgo,
          },
          expiresAt: {
            gt: new Date(), // 还没过期
          },
        },
        select: {
          orderNo: true,
          paymentMethod: true,
        },
        take: 50, // 限制批量处理数量
      });

      if (pendingOrders.length === 0) {
        this.logger.debug('没有需要同步状态的订单');
        return;
      }

      this.logger.log(`开始同步 ${pendingOrders.length} 个订单的支付状态`);

      // 这里可以调用支付宝/微信的查询接口来确认状态
      // 暂时跳过具体实现，避免频繁调用第三方API

    } catch (error) {
      this.logger.error('同步支付状态失败', error.stack);
    }
  }
}