// src/admin/admin.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { User, Subscription } from '@media-hub/database';

// 定义返回类型接口
interface UserOverview {
  user: {
    id: number;
    email: string | null;
    username: string | null;
    createdAt: Date;
  } | null;
  subscriptions: Subscription[];
  totalSubscriptions: number;
}

interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  monthlyRevenue: number;
}

interface UsersList {
  users: any[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * 获取用户概览信息
   */
  async getUserOverview(userId: number): Promise<UserOverview> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        email: true, 
        username: true, 
        createdAt: true
      }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const subscriptions = await this.db.subscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    const totalSubscriptions = await this.db.subscription.count({
      where: { userId }
    });

    return {
      user,
      subscriptions,
      totalSubscriptions
    };
  }

  /**
   * 批量操作用户订阅
   */
  async batchUpdateSubscriptions(userIds: number[], updates: Partial<Subscription>): Promise<number> {
    const result = await this.db.subscription.updateMany({
      where: {
        userId: { in: userIds },
        status: 1 // ACTIVE
      },
      data: updates
    });

    this.logger.log(`Batch updated ${result.count} subscriptions`);
    return result.count;
  }

  /**
   * 获取用户列表（管理员功能）
   */
  async getUsersList(page: number = 1, limit: number = 20, search?: string): Promise<UsersList> {
    const skip = (page - 1) * limit;
    
    const where = search ? {
      OR: [
        { username: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      this.db.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          phone: true,
          status: true,
          createdAt: true,
          _count: {
            select: {
              subscriptions: {
                where: { status: 1 }
              }
            }
          }
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      this.db.user.count({ where })
    ]);

    return {
      users,
      total,
      page,
      limit
    };
  }

  /**
   * 获取订阅统计数据（管理员仪表板）
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const [
      totalUsers,
      activeSubscriptions,
      expiredSubscriptions,
      monthlyRevenue
    ] = await Promise.all([
      this.db.user.count(),
      this.db.subscription.count({ where: { status: 1 } }),
      this.db.subscription.count({ where: { status: 0 } }),
      this.getMonthlyRevenue()
    ]);

    return {
      totalUsers,
      activeSubscriptions,
      expiredSubscriptions,
      monthlyRevenue
    };
  }

  /**
   * 禁用/启用用户
   */
  async toggleUserStatus(userId: number): Promise<void> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { status: true }
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const newStatus = user.status === 1 ? 0 : 1;
    
    await this.db.user.update({
      where: { id: userId },
      data: { status: newStatus }
    });

    this.logger.log(`User ${userId} status changed to ${newStatus ? 'active' : 'disabled'}`);
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
}