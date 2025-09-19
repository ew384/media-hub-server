// packages/payment-api/src/payment/payment.service.ts
import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/database/prisma.service';
import { RedisService } from '../common/redis/redis.service';
import { AlipayService } from './services/alipay.service';
import { WechatPayService } from './services/wechat-pay.service';
import { QueueService } from './services/queue.service';
import { CreateOrderDto, QueryOrdersDto, CreateRefundDto } from './dto';
import { PAYMENT_STATUS, PAYMENT_METHOD, SUBSCRIPTION_PLANS, ORDER_EXPIRE_MINUTES } from './constants/payment.constants';
import { generateOrderNo, generateRefundNo, calculateExpireTime, formatAmount } from './utils';
import * as QRCode from 'qrcode';
import * as moment from 'moment';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly alipayService: AlipayService,
    private readonly wechatPayService: WechatPayService,
    private readonly queueService: QueueService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
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
    const expiresAt = calculateExpireTime(ORDER_EXPIRE_MINUTES);

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
      this.logger.error(`创建支付订单失败: ${error.message}`, error.stack);
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

    this.logger.log(`订单创建成功: ${orderNo}, 用户ID: ${userId}, 金额: ${finalAmount}`);

    return {
      orderNo,
      planInfo: {
        planId,
        planName: planInfo.name,
        originalAmount: formatAmount(originalAmount),
        discountAmount: formatAmount(discountAmount),
        finalAmount: formatAmount(finalAmount),
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
    // 🔥 检查状态变化标记 - 核心逻辑
    const statusChangeKey = `order_status_changed:${orderNo}`;
    const hasStatusChanged = await this.redis.exists(statusChangeKey);
    
    let statusChanged = false;
    if (hasStatusChanged) {
      // 有状态变化标记，清除它并标记状态已变化
      await this.redis.del(statusChangeKey);
      statusChanged = true;
      
      this.logger.log(`🔥 检测到订单状态变化: ${orderNo}`);
    }
    const statusMap = {
      [PAYMENT_STATUS.PENDING]: '待支付',
      [PAYMENT_STATUS.FAILED]: '支付失败',
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
        finalAmount: formatAmount(Number(order.finalAmount)),
      },
      tradeNo: order.tradeNo,
      paidAt: order.paidAt,
      subscription,
      // 🔥 关键：状态变化标识
      statusChanged,
      lastUpdated: order.updatedAt,
      // 🔥 新增：变化类型（用于前端优化显示）
      changeType: statusChanged ? this.getChangeType(order.paymentStatus) : null      
    };
  }

  async handleAlipayCallback(callbackData: any) {
    const { out_trade_no: orderNo, trade_status, trade_no } = callbackData;

    this.logger.log(`收到支付宝回调: ${orderNo}, 状态: ${trade_status}`);

    // 验证签名
    const isValid = await this.alipayService.verifyCallback(callbackData);
    if (!isValid) {
      this.logger.error(`支付宝回调签名验证失败: ${orderNo}`);
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

    this.logger.log(`收到微信支付回调: ${orderNo}, 状态: ${result_code}`);

    // 验证签名
    const isValid = await this.wechatPayService.verifyCallback(callbackData);
    if (!isValid) {
      this.logger.error(`微信支付回调签名验证失败: ${orderNo}`);
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
      this.logger.error(`处理支付成功时订单不存在: ${orderNo}`);
      throw new NotFoundException('订单不存在');
    }

    if (order.paymentStatus === PAYMENT_STATUS.PAID) {
      this.logger.warn(`订单已处理过: ${orderNo}`);
      return; // 已经处理过了，避免重复处理
    }

    const paidAt = new Date();
    const planInfo = SUBSCRIPTION_PLANS[order.planId];

    try {
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

        // 标记回调为已处理
        await tx.paymentCallback.updateMany({
          where: { orderNo, status: 0 },
          data: { status: 1, processedAt: paidAt },
        });
      });

      // 🔥 关键：设置状态变化标记（30秒过期）
      const statusChangeKey = `order_status_changed:${orderNo}`;
      await this.redis.setex(statusChangeKey, 30, JSON.stringify({
        orderNo,
        fromStatus: PAYMENT_STATUS.PENDING,
        toStatus: PAYMENT_STATUS.PAID,
        changedAt: paidAt.toISOString(),
        tradeNo
      }));

      this.logger.log(`✅ 支付成功状态变化标记已设置: ${orderNo}`);

      // 调用订阅服务创建订阅
      await this.createSubscriptionAfterPayment(order.userId, {
        planId: order.planId,
        paidPrice: Number(order.finalAmount),
        startDate: paidAt,
        autoRenew: false,
      });

      // 清除订单缓存
      await this.redis.del(`order:${orderNo}`);

      // 发送支付成功通知
      await this.queueService.addPaymentSuccessJob({
        orderNo,
        userId: order.userId,
        planId: order.planId,
        amount: Number(order.finalAmount),
      });

      this.logger.log(`支付成功处理完成: ${orderNo}, 用户ID: ${order.userId}`);

    } catch (error) {
      this.logger.error(`处理支付成功失败: ${orderNo}`, error.stack);
      throw error;
    }
  }

  // 🔥 新增：获取变化类型
  private getChangeType(paymentStatus: number): string {
    switch (paymentStatus) {
      case PAYMENT_STATUS.PAID:
        return 'payment_success';
      case PAYMENT_STATUS.FAILED:
        return 'payment_failed';
      case PAYMENT_STATUS.CANCELLED:
        return 'payment_cancelled';
      case PAYMENT_STATUS.EXPIRED:
        return 'payment_expired';
      default:
        return 'status_update';
    }
  }

  /**
   * 调用订阅服务创建订阅
   */
  private async createSubscriptionAfterPayment(userId: number, subscriptionData: {
    planId: string;
    paidPrice: number;
    startDate: Date;
    autoRenew: boolean;
  }) {
    try {
      const subscriptionApiUrl = this.configService.get('SUBSCRIPTION_API_URL') || 'http://localhost:3101';
      const authApiUrl = this.configService.get('AUTH_API_URL') || 'http://localhost:3100';

      // 1. 先获取用户token（服务间调用）
      const tokenResponse = await firstValueFrom(
        this.httpService.post(`${authApiUrl}/auth/service-token`, {
          userId,
          service: 'payment-api',
        })
      );

      const token = tokenResponse.data.data.token;

      // 2. 调用订阅服务创建订阅
      const response = await firstValueFrom(
        this.httpService.post(`${subscriptionApiUrl}/subscription`, subscriptionData, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
      );

      if (response.data.code === 201) {
        this.logger.log(`订阅创建成功: 用户ID ${userId}, 套餐 ${subscriptionData.planId}`);
        return response.data.data;
      } else {
        throw new Error(`订阅创建失败: ${response.data.message}`);
      }

    } catch (error) {
      this.logger.error(`调用订阅服务失败: ${error.message}`, error.stack);
      // 这里可以选择重试或者记录到队列中稍后处理
      throw error;
    }
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

    // 🔥 设置状态变化标记
    const statusChangeKey = `order_status_changed:${orderNo}`;
    await this.redis.setex(statusChangeKey, 30, JSON.stringify({
      orderNo,
      fromStatus: PAYMENT_STATUS.PENDING,
      toStatus: PAYMENT_STATUS.CANCELLED,
      changedAt: new Date().toISOString(),
      reason: 'user_cancelled'
    }));

    // 清除缓存
    await this.redis.del(`order:${orderNo}`);

    this.logger.log(`订单已取消: ${orderNo}`);

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
        finalAmount: formatAmount(Number(order.finalAmount)),
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
    const { orderNo, refundReason, refundAmount } = createRefundDto;

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
    const actualRefundAmount = refundAmount || Number(order.finalAmount);
    let tradeRefundNo: string;

    try {
      // 调用第三方退款接口
      if (order.paymentMethod === PAYMENT_METHOD.ALIPAY) {
        tradeRefundNo = await this.alipayService.refund({
          outTradeNo: orderNo,
          outRequestNo: refundNo,
          refundAmount: actualRefundAmount,
          refundReason,
        });
      } else {
        tradeRefundNo = await this.wechatPayService.refund({
          outTradeNo: orderNo,
          outRefundNo: refundNo,
          totalFee: Math.round(Number(order.finalAmount) * 100),
          refundFee: Math.round(actualRefundAmount * 100),
        });
      }
    } catch (error) {
      this.logger.error(`退款申请失败: ${orderNo}`, error.stack);
      throw new BadRequestException('退款申请失败');
    }

    // 创建退款记录
    const refund = await this.prisma.refund.create({
      data: {
        orderNo,
        refundNo,
        refundAmount: actualRefundAmount,
        refundReason,
        refundStatus: 0,
        tradeRefundNo,
      },
    });

    this.logger.log(`退款申请已提交: ${refundNo}, 金额: ${actualRefundAmount}`);

    return {
      refundNo: refund.refundNo,
      refundAmount: formatAmount(Number(refund.refundAmount)),
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

    const discount = discountMap[couponCode] || 0;
    
    if (discount > 0) {
      this.logger.log(`应用优惠券: ${couponCode}, 折扣金额: ${discount}`);
    }

    return discount;
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

    // 🔥 设置状态变化标记
    const statusChangeKey = `order_status_changed:${orderNo}`;
    await this.redis.setex(statusChangeKey, 30, JSON.stringify({
      orderNo,
      fromStatus: PAYMENT_STATUS.PENDING,
      toStatus: PAYMENT_STATUS.EXPIRED,
      changedAt: new Date().toISOString(),
      reason: 'timeout'
    }));

    await this.redis.del(`order:${orderNo}`);

    this.logger.log(`订单已过期: ${orderNo}`);
  }
}