import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { EmailService } from '../../email/email.service';
import { SUBSCRIPTION_PLANS } from '../constants/payment.constants';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async sendPaymentSuccessNotification(data: {
    orderNo: string;
    userId: number;
    planId: string;
    amount: number;
  }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, username: true },
      });

      if (!user?.email) {
        this.logger.warn(`用户 ${data.userId} 没有邮箱，跳过邮件通知`);
        return;
      }

      const planInfo = SUBSCRIPTION_PLANS[data.planId];
      
      await this.emailService.sendPaymentSuccessEmail(user.email, {
        orderNo: data.orderNo,
        planName: planInfo?.name || data.planId,
        amount: data.amount,
        paidAt: new Date(),
      });

      this.logger.log(`支付成功通知已发送: ${user.email} - ${data.orderNo}`);
    } catch (error) {
      this.logger.error(`发送支付成功通知失败: ${error.message}`, error.stack);
    }
  }

  async sendRefundNotification(data: {
    orderNo: string;
    userId: number;
    refundAmount: number;
    refundReason?: string;
  }) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: data.userId },
        select: { email: true, username: true },
      });

      if (!user?.email) {
        this.logger.warn(`用户 ${data.userId} 没有邮箱，跳过邮件通知`);
        return;
      }

      await this.emailService.sendRefundNotificationEmail(user.email, {
        orderNo: data.orderNo,
        refundAmount: data.refundAmount,
        refundReason: data.refundReason,
      });

      this.logger.log(`退款通知已发送: ${user.email} - ${data.orderNo}`);
    } catch (error) {
      this.logger.error(`发送退款通知失败: ${error.message}`, error.stack);
    }
  }
}