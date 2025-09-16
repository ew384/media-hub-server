// src/subscription/subscription.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Subscription } from '@media-hub/database';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PreviewSubscriptionDto } from './dto/preview-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import {
  SUBSCRIPTION_PLANS,
  SubscriptionStatus,
  FEATURES
} from './constants/subscription.constants';
import {
  SubscriptionStatusResponse,
  SubscriptionPreview,
  SubscriptionHistory,
  ExpiringSubscription,
  SubscriptionStats,
  FeatureStatus
} from './interfaces/subscription.interface';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * 获取所有套餐列表
   */
  async getPlans() {
    return {
      plans: Object.values(SUBSCRIPTION_PLANS).map(plan => ({
        ...plan,
        originalPrice: plan.price,
        isPopular: plan.isPopular || false
      }))
    };
  }

  /**
   * 创建订阅
   */
  async createSubscription(userId: number, createDto: CreateSubscriptionDto): Promise<Subscription> {
    const plan = SUBSCRIPTION_PLANS[createDto.planId];
    if (!plan) {
      throw new BadRequestException('Invalid plan ID');
    }

    // 检查是否已有有效订阅
    const existingSubscription = await this.getActiveSubscription(userId);
    if (existingSubscription) {
      throw new BadRequestException('User already has an active subscription');
    }

    const startDate = createDto.startDate ? new Date(createDto.startDate) : new Date();
    const endDate = this.calculateEndDate(startDate, plan.duration, plan.unit);

    const subscription = await this.db.subscription.create({
      data: {
        userId,
        planId: createDto.planId,
        planName: plan.name,
        originalPrice: plan.price,
        paidPrice: createDto.paidPrice,
        startDate,
        endDate,
        status: SubscriptionStatus.ACTIVE,
        autoRenew: createDto.autoRenew
      }
    });

    this.logger.log(`Created subscription for user ${userId}: ${createDto.planId}`);
    return subscription;
  }

  /**
   * 获取用户当前订阅状态
   */
  async getSubscriptionStatus(userId: number): Promise<SubscriptionStatusResponse> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription || !this.isSubscriptionActive(subscription)) {
      return {
        isActive: false,
        planId: null,
        planName: null,
        startDate: null,
        endDate: null,
        remainingDays: 0,
        autoRenew: false,
        permissions: [],
        features: {}
      };
    }

    const permissions = this.getPlanPermissions(subscription.planId);
    const features = this.getPlanFeatures(subscription.planId);
    const remainingDays = this.calculateRemainingDays(subscription.endDate);

    return {
      isActive: true,
      planId: subscription.planId,
      planName: subscription.planName,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      remainingDays,
      autoRenew: subscription.autoRenew,
      permissions,
      features
    };
  }

  /**
   * 预览订阅（计算价格和到期时间）
   */
  async previewSubscription(userId: number, previewDto: PreviewSubscriptionDto): Promise<SubscriptionPreview> {
    const plan = SUBSCRIPTION_PLANS[previewDto.planId];
    if (!plan) {
      throw new BadRequestException('Invalid plan ID');
    }

    const startDate = previewDto.startDate ? new Date(previewDto.startDate) : new Date();
    const endDate = this.calculateEndDate(startDate, plan.duration, plan.unit);
    
    // 计算折扣价格
    const originalPrice = plan.price;
    const discount = plan.discount || 0;
    const finalPrice = originalPrice * (1 - discount / 100);

    return {
      planId: plan.id,
      planName: plan.name,
      originalPrice,
      finalPrice: Math.round(finalPrice * 100) / 100,
      discount,
      startDate,
      endDate,
      duration: plan.duration,
      unit: plan.unit,
      features: plan.features
    };
  }

  /**
   * 获取订阅历史
   */
  async getSubscriptionHistory(userId: number, query: SubscriptionQueryDto): Promise<{
    subscriptions: SubscriptionHistory[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, status, planId } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    
    if (status !== undefined) {
      where.status = status;
    }
    
    if (planId) {
      where.planId = planId;
    }

    const [subscriptions, total] = await Promise.all([
      this.db.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.subscription.count({ where })
    ]);

    return {
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        planId: sub.planId,
        planName: sub.planName,
        originalPrice: parseFloat(sub.originalPrice.toString()), // 转换 Decimal 为 number
        paidPrice: parseFloat(sub.paidPrice.toString()), // 转换 Decimal 为 number
        startDate: sub.startDate,
        endDate: sub.endDate,
        status: sub.status,
        createdAt: sub.createdAt
      })),
      total,
      page,
      limit
    };
  }

  /**
   * 取消自动续费
   */
  async cancelAutoRenew(userId: number): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    await this.db.subscription.update({
      where: { id: subscription.id },
      data: { autoRenew: false }
    });
    
    this.logger.log(`Cancelled auto-renew for user ${userId}`);
  }

  /**
   * 恢复自动续费
   */
  async resumeAutoRenew(userId: number): Promise<void> {
    const subscription = await this.getActiveSubscription(userId);
    if (!subscription) {
      throw new NotFoundException('No active subscription found');
    }

    await this.db.subscription.update({
      where: { id: subscription.id },
      data: { autoRenew: true }
    });
    
    this.logger.log(`Resumed auto-renew for user ${userId}`);
  }

  /**
   * 获取即将过期的订阅
   */
  async getExpiringSubscriptions(days: number = 7): Promise<ExpiringSubscription[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const subscriptions = await this.db.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lte: futureDate,
          gt: new Date()
        }
      },
      include: {
        user: {
          select: { email: true }
        }
      }
    });

    return subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      planName: sub.planName,
      endDate: sub.endDate,
      remainingDays: this.calculateRemainingDays(sub.endDate),
      userEmail: sub.user?.email,
      autoRenew: sub.autoRenew
    }));
  }

  /**
   * 处理过期订阅
   */
  async handleExpiredSubscriptions(): Promise<number> {
    const result = await this.db.subscription.updateMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          lt: new Date()
        }
      },
      data: {
        status: SubscriptionStatus.EXPIRED
      }
    });

    this.logger.log(`Processed ${result.count} expired subscriptions`);
    return result.count;
  }

  /**
   * 管理员：手动修改用户订阅状态
   */
  async updateSubscriptionByAdmin(userId: number, updateDto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.db.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE }
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for user');
    }

    const updated = await this.db.subscription.update({
      where: { id: subscription.id },
      data: updateDto
    });
    
    this.logger.log(`Admin updated subscription for user ${userId}`);
    return updated;
  }

  /**
   * 管理员：延长会员时间
   */
  async extendSubscription(userId: number, days: number): Promise<Subscription> {
    const subscription = await this.db.subscription.findFirst({
      where: { userId, status: SubscriptionStatus.ACTIVE }
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for user');
    }

    const newEndDate = new Date(subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    const updated = await this.db.subscription.update({
      where: { id: subscription.id },
      data: { endDate: newEndDate }
    });
    
    this.logger.log(`Extended subscription for user ${userId} by ${days} days`);
    return updated;
  }

  /**
   * 获取订阅统计数据
   */
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const [totalActive, totalExpired, planDistribution, monthlyRevenue, autoRenewCount] = await Promise.all([
      this.db.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE }
      }),
      this.db.subscription.count({
        where: { status: SubscriptionStatus.EXPIRED }
      }),
      this.db.subscription.groupBy({
        by: ['planId'],
        where: { status: SubscriptionStatus.ACTIVE },
        _count: { planId: true }
      }),
      this.getMonthlyRevenue(),
      this.db.subscription.count({
        where: { status: SubscriptionStatus.ACTIVE, autoRenew: true }
      })
    ]);

    const planDistributionMap = planDistribution.reduce((acc, item) => {
      acc[item.planId] = item._count.planId;
      return acc;
    }, {} as Record<string, number>);

    // 即将过期数量（7天内）
    const expiringSubscriptions = await this.getExpiringSubscriptions(7);

    return {
      totalActiveSubscriptions: totalActive,
      totalExpiredSubscriptions: totalExpired,
      planDistribution: planDistributionMap,
      monthlyRevenue: monthlyRevenue,
      expiringInWeek: expiringSubscriptions.length,
      autoRenewRate: totalActive > 0 ? (autoRenewCount / totalActive) * 100 : 0
    };
  }

  // 私有辅助方法

  private async getActiveSubscription(userId: number): Promise<Subscription | null> {
    return this.db.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: {
          gt: new Date()
        }
      }
    });
  }

  private async getMonthlyRevenue(): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.db.subscription.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth
        }
      },
      _sum: {
        paidPrice: true
      }
    });

    return parseFloat(result._sum.paidPrice?.toString() || '0');
  }

  private calculateEndDate(startDate: Date, duration: number, unit: 'month' | 'year'): Date {
    const endDate = new Date(startDate);
    
    if (unit === 'month') {
      endDate.setMonth(endDate.getMonth() + duration);
    } else if (unit === 'year') {
      endDate.setFullYear(endDate.getFullYear() + duration);
    }
    
    return endDate;
  }

  private calculateRemainingDays(endDate: Date): number {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  private isSubscriptionActive(subscription: Subscription): boolean {
    return subscription.status === SubscriptionStatus.ACTIVE && subscription.endDate > new Date();
  }

  private getPlanPermissions(planId: string): string[] {
    const permissions: string[] = [];
    
    Object.entries(FEATURES).forEach(([featureKey, feature]) => {
      if (feature.requiredPlans.includes(planId)) {
        permissions.push(featureKey);
      }
    });
    
    return permissions;
  }

  private getPlanFeatures(planId: string): Record<string, FeatureStatus> {
    const features: Record<string, FeatureStatus> = {};
    
    Object.entries(FEATURES).forEach(([featureKey, feature]) => {
      const hasAccess = feature.requiredPlans.includes(planId);
      const limit = feature.limits?.[planId];
      
      features[featureKey] = {
        enabled: hasAccess,
        limit: typeof limit === 'number' ? limit : undefined,
        type: featureKey === 'priority_support' ? 'priority' : 'standard'
      };
    });
    
    return features;
  }
}
