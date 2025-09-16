// src/payment/processors/payment.processor.ts
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PaymentService } from '../services/payment.service';
import { NotificationService } from '../services/notification.service';
import { Logger } from '@nestjs/common';

@Processor('payment')
export class PaymentProcessor {
  private readonly logger = new Logger(PaymentProcessor.name);

  constructor(
    private paymentService: PaymentService,
    private notificationService: NotificationService,
  ) {}

  @Process('expire-order')
  async handleExpireOrder(job: Job<{ orderNo: string }>) {
    const { orderNo } = job.data;
    this.logger.log(`Processing order expiration: ${orderNo}`);
    
    try {
      await this.paymentService.expireOrder(orderNo);
      this.logger.log(`Order expired successfully: ${orderNo}`);
    } catch (error) {
      this.logger.error(`Failed to expire order ${orderNo}:`, error);
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
    const { orderNo, userId, planId, amount } = job.data;
    this.logger.log(`Processing payment success notification: ${orderNo}`);
    
    try {
      await this.notificationService.sendPaymentSuccessNotification({
        orderNo,
        userId,
        planId,
        amount,
      });
      this.logger.log(`Payment success notification sent: ${orderNo}`);
    } catch (error) {
      this.logger.error(`Failed to send payment success notification ${orderNo}:`, error);
      throw error;
    }
  }

  @Process('refund-notification')
  async handleRefundNotification(job: Job<{
    refundNo: string;
    orderNo: string;
    amount: number;
    status: string;
  }>) {
    const { refundNo, orderNo, amount, status } = job.data;
    this.logger.log(`Processing refund notification: ${refundNo}`);
    
    try {
      await this.notificationService.sendRefundNotification({
        refundNo,
        orderNo,
        amount,
        status,
      });
      this.logger.log(`Refund notification sent: ${refundNo}`);
    } catch (error) {
      this.logger.error(`Failed to send refund notification ${refundNo}:`, error);
      throw error;
    }
  }
}
