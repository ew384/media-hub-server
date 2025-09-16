// src/payment/services/payment.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { AlipayService } from './alipay.service';
import { WechatPayService } from './wechat-pay.service';
import { QueueService } from './queue.service';
import { CreateOrderDto, CreateRefundDto } from '../dto';
import { PAYMENT_STATUS, PAYMENT_METHOD, SUBSCRIPTION_PLANS, ORDER_EXPIRE_MINUTES } from '../constants';
import { generateOrderNo, generateRefundNo } from '../utils';
import * as QRCode from 'qrcode';
import * as moment from 'moment';

@Injectable()
export class PaymentService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private alipayService: AlipayService,
    private wechatPayService: WechatPayService,
    private queueService: QueueService,
  ) {}

  async createOrder(userId: number, createOrderDto: CreateOrderDto) {
    const { planId, paymentMethod, couponCode } = createOrderDto;
    
    // 验证套餐
    if (!SUBSCRIPTION_PLANS[planId]) {
      throw new BadRequestException('无效的套餐类型');
    }

    const planInfo = SUBSCRIPTION_PLANS[planId];
    let originalAmount = planInfo.price;
    let discountAmount = 0;

    // 处理优惠券
    if (couponCode) {
      discountAmount = await this.applyCoupon(userId, couponCode, originalAmount);
    }

    const finalAmount = originalAmount - discountAmount;
    const orderNo = generateOrderNo();
    const expiresAt = moment().add(ORDER_EXPIRE_MINUTES, 'minutes').toDate();

    // 创建预支付订单
    let qrCodeUrl: string;
    let qrCodeData: string;

    try {
      if (paymentMethod === PAYMENT_METHOD.ALIPAY) {
        qrCodeUrl = await this.alipayService.createQRCodePayment({
          outTradeNo: orderNo,
          subject: planInfo.name,
          totalAmount: finalAmount,
        });
      } else {
        qrCodeUrl = await this.wechatPayService.createQRCodePayment({
          outTradeNo: orderNo,
          body: planInfo.name,
          totalFee: Math.round(finalAmount * 100), // 微信以分为单位
        });
      }

      // 生成二维码图片
      qrCodeData = await QRCode.toDataURL(qrCodeUrl);

    } catch (error) {
      throw new BadRequestException('创建支付订单失败');
    }

    // 保存订单到数据库
    const order = await this.prisma.order.create({
      data: {
        orderNo,
        userId,
        planId,
        planName: planInfo.name,
        originalAmount,
        discountAmount,
        finalAmount,
        paymentMethod,
        paymentStatus: PAYMENT_STATUS.PENDING,
        qrCodeUrl,
        expiresAt,
      },
    });

    // 缓存订单信息
    await this.redis.setex(`order:${orderNo}`, 900, JSON.stringify({
      orderNo,
      userId,
      finalAmount,
      paymentMethod,
      expiresAt: expiresAt.toISOString(),
    }));

    // 设置订单过期任务
    await this.queueService.addExpireOrderJob(orderNo, ORDER_EXPIRE_MINUTES * 60 * 1000);

    return {
      orderNo,
      planInfo: {
        planId,
        planName: planInfo.name,
        originalAmount,
        discountAmount,
        finalAmount,
      },
      qrCodeUrl,
      qrCodeData,
      expiresAt,
      expiresIn: ORDER_EXPIRE_MINUTES * 60,
    };
  }

  async getOrderStatus(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    const statusMap = {
      [PAYMENT_STATUS.PENDING]: '待支付',
      [PAYMENT_STATUS.PAID]: '已支付',
      [PAYMENT_STATUS.REFUNDED]: '已退款',
      [PAYMENT_STATUS.CANCELLED]: '已取消',
      [PAYMENT_STATUS.EXPIRED]: '已过期',
    };

    let subscription = null;
    if (order.paymentStatus === PAYMENT_STATUS.PAID && order.paidAt) {
      const planInfo = SUBSCRIPTION_PLANS[order.planId];
      const startDate = order.paidAt;
      const endDate = moment(startDate).add(planInfo.duration, 'months').toDate();
      
      subscription = { startDate, endDate };
    }

    return {
      orderNo: order.orderNo,
      paymentStatus: order.paymentStatus,
      statusText: statusMap[order.paymentStatus],
      planInfo: {
        planId: order.planId,
        planName: order.planName,
        finalAmount: order.finalAmount,
      },
      tradeNo: order.tradeNo,
      paidAt: order.paidAt,
      subscription,
    };
  }

  async handleAlipayCallback(callbackData: any) {
    const { out_trade_no: orderNo, trade_status, trade_no } = callbackData;

    // 验证签名
    const isValid = await this.alipayService.verifyCallback(callbackData);
    if (!isValid) {
      throw new BadRequestException('无效的回调签名');
    }

    // 记录回调
    await this.prisma.paymentCallback.create({
      data: {
        orderNo,
        paymentMethod: PAYMENT_METHOD.ALIPAY,
        tradeNo: trade_no,
        callbackData,
        signature: callbackData.sign,
        status: 0,
      },
    });

    // 处理支付状态
    if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
      await this.processPaymentSuccess(orderNo, trade_no);
    }

    return 'success';
  }

  async handleWechatCallback(callbackData: any) {
    const { out_trade_no: orderNo, transaction_id: tradeNo, result_code } = callbackData;

    // 验证签名
    const isValid = await this.wechatPayService.verifyCallback(callbackData);
    if (!isValid) {
      throw new BadRequestException('无效的回调签名');
    }

    // 记录回调
    await this.prisma.paymentCallback.create({
      data: {
        orderNo,
        paymentMethod: PAYMENT_METHOD.WECHAT,
        tradeNo,
        callbackData,
        status: 0,
      },
    });

    // 处理支付状态
    if (result_code === 'SUCCESS') {
      await this.processPaymentSuccess(orderNo, tradeNo);
    }

    return '<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>';
  }

  private async processPaymentSuccess(orderNo: string, tradeNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      return; // 已经处理过了，避免重复处理
    }

    const paidAt = new Date();
    const planInfo = SUBSCRIPTION_PLANS[order.planId];

    await this.prisma.$transaction(async (tx) => {
      // 更新订单状态
      await tx.order.update({
        where: { orderNo },
        data: {
          paymentStatus: PAYMENT_STATUS.PAID,
          tradeNo,
          paidAt,
        },
      });

      // 更新用户订阅
      const endDate = moment(paidAt).add(planInfo.duration, 'months').toDate();
      await tx.subscription.upsert({
        where: { userId: order.userId },
        update: {
          planId: order.planId,
          startDate: paidAt,
          endDate,
          status: 1, // 激活
          updatedAt: paidAt,
        },
        create: {
          userId: order.userId,
          planId: order.planId,
          startDate: paidAt,
          endDate,
          status: 1,
        },
      });

      // 标记回调为已处理
      await tx.paymentCallback.updateMany({
        where: { orderNo, status: 0 },
        data: { status: 1, processedAt: paidAt },
      });
    });

    // 清除订单缓存
    await this.redis.del(`order:${orderNo}`);

    // 发送支付成功通知
    await this.queueService.addPaymentSuccessJob({
      orderNo,
      userId: order.userId,
      planId: order.planId,
      amount: order.finalAmount,
    });
  }

  async cancelOrder(orderNo: string, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.userId !== userId) {
      throw new BadRequestException('无权操作此订单');
    }

    if (order.paymentStatus !== PAYMENT_STATUS.PENDING) {
      throw new BadRequestException('只能取消待支付订单');
    }

    await this.prisma.order.update({
      where: { orderNo },
      data: {
        paymentStatus: PAYMENT_STATUS.CANCELLED,
        updatedAt: new Date(),
      },
    });

    // 清除缓存
    await this.redis.del(`order:${orderNo}`);

    return { message: '订单已取消' };
  }

  async getUserOrders(userId: number, query: QueryOrdersDto) {
    const { page = 1, limit = 10, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (status !== undefined) {
      where.paymentStatus = status;
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          orderNo: true,
          planId: true,
          planName: true,
          finalAmount: true,
          paymentMethod: true,
          paymentStatus: true,
          tradeNo: true,
          paidAt: true,
          createdAt: true,
          expiresAt: true,
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    const statusMap = {
      [PAYMENT_STATUS.PENDING]: '待支付',
      [PAYMENT_STATUS.PAID]: '已支付',
      [PAYMENT_STATUS.REFUNDED]: '已退款',
      [PAYMENT_STATUS.CANCELLED]: '已取消',
      [PAYMENT_STATUS.EXPIRED]: '已过期',
    };

    return {
      list: orders.map(order => ({
        ...order,
        statusText: statusMap[order.paymentStatus],
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createRefund(createRefundDto: CreateRefundDto) {
    const { orderNo, refundReason } = createRefundDto;

    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException('订单不存在');
    }

    if (order.paymentStatus !== PAYMENT_STATUS.PAID) {
      throw new BadRequestException('只有已支付订单才能退款');
    }

    // 检查是否已经有退款记录
    const existingRefund = await this.prisma.refund.findFirst({
      where: { orderNo, refundStatus: { in: [0, 1] } },
    });

    if (existingRefund) {
      throw new BadRequestException('该订单已有退款记录');
    }

    const refundNo = generateRefundNo();
    let tradeRefundNo: string;

    try {
      // 调用第三方退款接口
      if (order.paymentMethod === PAYMENT_METHOD.ALIPAY) {
        tradeRefundNo = await this.alipayService.refund({
          outTradeNo: orderNo,
          outRequestNo: refundNo,
          refundAmount: order.finalAmount,
          refundReason,
        });
      } else {
        tradeRefundNo = await this.wechatPayService.refund({
          outTradeNo: orderNo,
          outRefundNo: refundNo,
          totalFee: Math.round(Number(order.finalAmount) * 100),
          refundFee: Math.round(Number(order.finalAmount) * 100),
        });
      }
    } catch (error) {
      throw new BadRequestException('退款申请失败');
    }

    // 创建退款记录
    const refund = await this.prisma.refund.create({
      data: {
        orderNo,
        refundNo,
        refundAmount: order.finalAmount,
        refundReason,
        refundStatus: 0,
        tradeRefundNo,
      },
    });

    return {
      refundNo: refund.refundNo,
      refundAmount: refund.refundAmount,
      message: '退款申请已提交',
    };
  }

  private async applyCoupon(userId: number, couponCode: string, amount: number): Promise<number> {
    // 这里实现优惠券逻辑
    // 示例：固定折扣
    const discountMap = {
      'DISCOUNT10': amount * 0.1,
      'DISCOUNT20': amount * 0.2,
      'NEW_USER': amount * 0.15,
    };

    return discountMap[couponCode] || 0;
  }

  async expireOrder(orderNo: string) {
    const order = await this.prisma.order.findUnique({
      where: { orderNo },
    });

    if (!order || order.paymentStatus !== PAYMENT_STATUS.PENDING) {
      return;
    }

    await this.prisma.order.update({
      where: { orderNo },
      data: {
        paymentStatus: PAYMENT_STATUS.EXPIRED,
        updatedAt: new Date(),
      },
    });

    await this.redis.del(`order:${orderNo}`);
  }
}
