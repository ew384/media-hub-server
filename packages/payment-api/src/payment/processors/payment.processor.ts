import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentService } from '../payment.service';
import { NotificationService } from '../services/notification.service';

@Processor('payment')
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private readonly paymentService: PaymentService,
    private readonly notificationService: NotificationService,
  ) {}

  @Process('expire-order')
  async handleExpireOrder(job: Job<{ orderNo: string }>) {
    const { orderNo } = job.data;
    
    try {
      await this.paymentService.expireOrder(orderNo);
      this.logger.log(`订单过期处理完成: ${orderNo}`);
    } catch (error) {
      this.logger.error(`订单过期处理失败: ${orderNo}`, error.stack);
      throw error;
    }
  }

  @Process('payment-success')
  async handlePaymentSuccess(job: Job<{
    orderNo: string;
    userId: number;
    planId: string;
    amount: number;
  }>) {
    const data = job.data;
    
    try {
      await this.notificationService.sendPaymentSuccessNotification(data);
      this.logger.log(`支付成功通知处理完成: ${data.orderNo}`);
    } catch (error) {
      this.logger.error(`支付成功通知处理失败: ${data.orderNo}`, error.stack);
      throw error;
    }
  }

  @Process('refund-notification')
  async handleRefundNotification(job: Job<{
    orderNo: string;
    userId: number;
    refundAmount: number;
    refundReason?: string;
  }>) {
    const data = job.data;
    
    try {
      await this.notificationService.sendRefundNotification(data);
      this.logger.log(`退款通知处理完成: ${data.orderNo}`);
    } catch (error) {
      this.logger.error(`退款通知处理失败: ${data.orderNo}`, error.stack);
      throw error;
    }
  }
}