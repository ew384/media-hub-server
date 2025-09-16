// packages/payment-api/src/common/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { prisma } from '@media-hub/database';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  // 使用共享的prisma实例
  private readonly client = prisma;

  async onModuleInit() {
    try {
      // 连接已在共享数据库包中处理，这里进行健康检查
      await this.client.$queryRaw`SELECT 1`;
      console.log('✅ Payment API - Database connected');
    } catch (error) {
      console.error('❌ Payment API - Database connection failed:', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    // 断开连接由共享数据库包管理
    console.log('🔌 Payment API - Database connection will be managed by shared database package');
  }

  // 提供对共享prisma客户端的访问
  get $() {
    return this.client;
  }

  // 为了兼容现有代码，暴露常用的模型访问器
  get user() {
    return this.client.user;
  }

  get order() {
    return this.client.order;
  }

  get paymentCallback() {
    return this.client.paymentCallback;
  }

  get refund() {
    return this.client.refund;
  }

  get subscription() {
    return this.client.subscription;
  }

  // 保持原有的方法兼容性
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
   * 健康检查
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Payment API database health check failed:', error);
      return false;
    }
  }
}