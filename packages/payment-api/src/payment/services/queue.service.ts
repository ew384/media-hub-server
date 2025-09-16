// src/payment/services/queue.service.ts
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  constructor(
    @InjectQueue('payment') private paymentQueue: Queue,
  ) {}

  async addExpireOrderJob(orderNo: string, delay: number) {
    return this.paymentQueue.add('expire-order', { orderNo }, {
      delay,
      jobId: `expire-${orderNo}`,
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async addPaymentSuccessJob(data: {
    orderNo: string;
    userId: number;
    planId: string;
    amount: number;
  }) {
    return this.paymentQueue.add('payment-success', data, {
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }

  async addRefundNotificationJob(data: {
    refundNo: string;
    orderNo: string;
    amount: number;
    status: string;
  }) {
    return this.paymentQueue.add('refund-notification', data, {
      removeOnComplete: 10,
      removeOnFail: 5,
    });
  }
}
