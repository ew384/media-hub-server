// src/subscription/subscription.service.ts
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionFeature } from './entities/subscription-feature.entity';
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

  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(SubscriptionFeature)
    private featureRepository: Repository<SubscriptionFeature>,
  ) {}

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

    const subscription = this.subscriptionRepository.create({
      userId,
      planId: createDto.planId,
      planName: plan.name,
      originalPrice: plan.price,
      paidPrice: createDto.paidPrice,
      startDate,
      endDate,
      status: SubscriptionStatus.ACTIVE,
      autoRenew: createDto.autoRenew
    });

    const saved = await this.subscriptionRepository.save(subscription);
    this.logger.log(`Created subscription for user ${userId}: ${createDto.planId}`);
    
    return saved;
  }

  /**
   * 获取用户当前订阅状态
   */
  async getSubscriptionStatus(userId: number): Promise<SubscriptionStatusResponse> {
    const subscription = await this.getActiveSubscription(userId);
    
    if (!subscription || !subscription.isActive) {
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

    const plan = SUBSCRIPTION_PLANS[subscription.planId];
    const permissions = this.getPlanPermissions(subscription.planId);
    const features = this.getPlanFeatures(subscription.planId);

    return {
      isActive: true,
      planId: subscription.planId,
      planName: subscription.planName,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      remainingDays: subscription.remainingDays,
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
    const discount = plan.discount;
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

    const queryBuilder = this.subscriptionRepository
      .createQueryBuilder('subscription')
      .where('subscription.userId = :userId', { userId })
      .orderBy('subscription.createdAt', 'DESC');

    if (status !== undefined) {
      queryBuilder.andWhere('subscription.status = :status', { status });
    }

    if (planId) {
      queryBuilder.andWhere('subscription.planId = :planId', { planId });
    }

    const [subscriptions, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        planId: sub.planId,
        planName: sub.planName,
        originalPrice: sub.originalPrice,
        paidPrice: sub.paidPrice,
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

    await this.subscriptionRepository.update(subscription.id, { autoRenew: false });
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

    await this.subscriptionRepository.update(subscription.id, { autoRenew: true });
    this.logger.log(`Resumed auto-renew for user ${userId}`);
  }

  /**
   * 获取即将过期的订阅
   */
  async getExpiringSubscriptions(days: number = 7): Promise<ExpiringSubscription[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const subscriptions = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .leftJoinAndSelect('subscription.user', 'user')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('subscription.endDate <= :futureDate', { futureDate })
      .andWhere('subscription.endDate > :now', { now: new Date() })
      .getMany();

    return subscriptions.map(sub => ({
      id: sub.id,
      userId: sub.userId,
      planId: sub.planId,
      planName: sub.planName,
      endDate: sub.endDate,
      remainingDays: sub.remainingDays,
      userEmail: sub.user?.email,
      autoRenew: sub.autoRenew
    }));
  }

  /**
   * 处理过期订阅
   */
  async handleExpiredSubscriptions(): Promise<number> {
    const expiredSubscriptions = await this.subscriptionRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(new Date())
      }
    });

    if (expiredSubscriptions.length === 0) {
      return 0;
    }

    await this.subscriptionRepository.update(
      { id: In(expiredSubscriptions.map(s => s.id)) },
      { status: SubscriptionStatus.EXPIRED }
    );

    this.logger.log(`Processed ${expiredSubscriptions.length} expired subscriptions`);
    return expiredSubscriptions.length;
  }

  /**
   * 管理员：手动修改用户订阅状态
   */
  async updateSubscriptionByAdmin(userId: number, updateDto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE }
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for user');
    }

    Object.assign(subscription, updateDto);
    const updated = await this.subscriptionRepository.save(subscription);
    
    this.logger.log(`Admin updated subscription for user ${userId}`);
    return updated;
  }

  /**
   * 管理员：延长会员时间
   */
  async extendSubscription(userId: number, days: number): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE }
    });

    if (!subscription) {
      throw new NotFoundException('No active subscription found for user');
    }

    const newEndDate = new Date(subscription.endDate);
    newEndDate.setDate(newEndDate.getDate() + days);

    subscription.endDate = newEndDate;
    const updated = await this.subscriptionRepository.save(subscription);
    
    this.logger.log(`Extended subscription for user ${userId} by ${days} days`);
    return updated;
  }

  /**
   * 获取订阅统计数据
   */
  async getSubscriptionStats(): Promise<SubscriptionStats> {
    const totalActive = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE }
    });

    const totalExpired = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.EXPIRED }
    });

    // 获取套餐分布
    const planDistribution = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('subscription.planId', 'planId')
      .addSelect('COUNT(*)', 'count')
      .where('subscription.status = :status', { status: SubscriptionStatus.ACTIVE })
      .groupBy('subscription.planId')
      .getRawMany();

    const planDistributionMap = planDistribution.reduce((acc, item) => {
      acc[item.planId] = parseInt(item.count);
      return acc;
    }, {});

    // 计算月收入（当月新订阅）
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthlyRevenue = await this.subscriptionRepository
      .createQueryBuilder('subscription')
      .select('SUM(subscription.paidPrice)', 'revenue')
      .where('subscription.createdAt >= :startOfMonth', { startOfMonth })
      .getRawOne();

    // 即将过期数量（7天内）
    const expiringSubscriptions = await this.getExpiringSubscriptions(7);

    // 自动续费比例
    const autoRenewCount = await this.subscriptionRepository.count({
      where: { status: SubscriptionStatus.ACTIVE, autoRenew: true }
    });

    return {
      totalActiveSubscriptions: totalActive,
      totalExpiredSubscriptions: totalExpired,
      planDistribution: planDistributionMap,
      monthlyRevenue: parseFloat(monthlyRevenue?.revenue || '0'),
      expiringInWeek: expiringSubscriptions.length,
      autoRenewRate: totalActive > 0 ? (autoRenewCount / totalActive) * 100 : 0
    };
  }

  // 私有辅助方法

  private async getActiveSubscription(userId: number): Promise<Subscription | null> {
    return this.subscriptionRepository.findOne({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        endDate: MoreThan(new Date())
      }
    });
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