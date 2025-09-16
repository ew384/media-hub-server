// src/payment/services/notification.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { SUBSCRIPTION_PLANS } from '../constants';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async sendPaymentSuccessNotification(data: {
    orderNo: string;
    userId: number;
    planId: string;
    amount: number;
  }) {
    const { orderNo, userId, planId, amount } = data;
    
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    });

    if (!user) return;

    const planInfo = SUBSCRIPTION_PLANS[planId];
    
    // 发送邮件通知
    await this.emailService.sendEmail({
      to: user.email,
      subject: '支付成功通知',
      template: 'payment-success',
      context: {
        username: user.username,
        orderNo,
        planName: planInfo.name,
        amount,
        duration: planInfo.duration,
      },
    });

    // 记录通知日志
    await this.prisma.notificationLog.create({
      data: {
        userId,
        type: 'payment_success',
        title: '支付成功',
        content: `您的${planInfo.name}已支付成功，订单号：${orderNo}`,
        status: 1,
      },
    });
  }

  async sendRefundNotification(data: {
    refundNo: string;
    orderNo: string;
    amount: number;
    status: string;
  }) {
    const { refundNo, orderNo, amount, status } = data;
    
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        user: {
          select: { email: true, username: true },
        },
      },
    });

    if (!order) return;

    const statusText = status === 'success' ? '退款成功' : '退款失败';
    
    // 发送邮件通知
    await this.emailService.sendEmail({
      to: order.user.email,
      subject: `${statusText}通知`,
      template: 'refund-notification',
      context: {
        username: order.user.username,
        orderNo,
        refundNo,
        amount,
        status: statusText,
      },
    });

    // 记录通知日志
    await this.prisma.notificationLog.create({
      data: {
        userId: order.userId,
        type: 'refund_notification',
        title: statusText,
        content: `订单${orderNo}${statusText}，退款金额：¥${amount}`,
        status: 1,
      },
    });
  }

  async sendOrderExpiredNotification(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        user: {
          select: { email: true, username: true },
        },
      },
    });

    if (!order) return;

    await this.emailService.sendEmail({
      to: order.user.email,
      subject: '订单过期通知',
      template: 'order-expired',
      context: {
        username: order.user.username,
        orderNo,
        planName: order.planName,
        amount: order.finalAmount,
      },
    });
  }
}
