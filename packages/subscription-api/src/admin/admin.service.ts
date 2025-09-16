// src/admin/admin.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Subscription } from '../subscription/entities/subscription.entity';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
  ) {}

  /**
   * 获取用户概览信息
   */
  async getUserOverview(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'username', 'createdAt', 'lastLoginAt']
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const subscriptions = await this.subscriptionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 5
    });

    return {
      user,
      subscriptions,
      totalSubscriptions: subscriptions.length
    };
  }

  /**
   * 批量操作用户订阅
   */
  async batchUpdateSubscriptions(userIds: number[], updates: Partial<Subscription>) {
    const result = await this.subscriptionRepository.update(
      { userId: In(userIds), status: SubscriptionStatus.ACTIVE },
      updates
    );

    this.logger.log(`Batch updated ${result.affected} subscriptions`);
    return result.affected;
  }
}
