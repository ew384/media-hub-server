import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async check() {
    const timestamp = new Date().toISOString();
    const uptime = process.uptime();

    // 检查数据库连接
    let database = 'connected';
    try {
      await this.prisma.healthCheck();
    } catch (error) {
      database = 'disconnected';
    }

    // 检查Redis连接
    let redis = 'connected';
    try {
      await this.cacheManager.set('health_check', 'ok', 1000);
      await this.cacheManager.del('health_check');
    } catch (error) {
      redis = 'disconnected';
    }

    return {
      status: database === 'connected' && redis === 'connected' ? 'ok' : 'error',
      timestamp,
      uptime,
      database,
      redis,
    };
  }
}
