// packages/auth-api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@media-hub/database';
import type { PrismaClient } from '@media-hub/database';
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // 使用共享的prisma实例
  private readonly client = prisma;

  async onModuleInit() {
    try {
      // 连接已在共享数据库包中处理，这里进行健康检查
      const isHealthy = await this.healthCheck();
      if (isHealthy) {
        console.log('✅ Auth API - Database connected successfully');
      } else {
        throw new Error('Database health check failed');
      }
    } catch (error) {
      console.error('❌ Auth API - Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // 断开连接由共享数据库包管理
    console.log('🔌 Auth API - Database connection will be managed by shared database package');
  }

  // 修复：添加明确的返回类型注解
  get $(): PrismaClient {
    return this.client;
  }

  // 修复：为了兼容现有代码，暴露常用的模型访问器
  get user(): PrismaClient['user'] {
    return this.client.user;
  }

  get smsCode(): PrismaClient['smsCode'] {
    return this.client.smsCode;
  }

  get refreshToken(): PrismaClient['refreshToken'] {
    return this.client.refreshToken;
  }

  get loginAttempt(): PrismaClient['loginAttempt'] {
    return this.client.loginAttempt;
  }

  // 保持原有的方法
  async $connect() {
    return this.client.$connect();
  }

  async $disconnect() {
    return this.client.$disconnect();
  }

  async $queryRaw(query: any, ...values: any[]) {
    return this.client.$queryRaw(query, ...values);
  }

  async $transaction<T>(fn: (prisma: typeof this.client) => Promise<T>): Promise<T> {
    return await this.client.$transaction(fn);
  }

  /**
   * 清理过期的数据
   */
  async cleanupExpiredData() {
    const now = new Date();
    
    // 清理过期的短信验证码
    await this.client.smsCode.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // 清理过期的刷新令牌
    await this.client.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: now,
        },
      },
    });

    // 清理过期的登录尝试记录（保留7天）
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    await this.client.loginAttempt.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo,
        },
      },
    });
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}
