import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { Public } from '../common/decorators';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '健康检查' })
  @ApiResponse({
    status: 200,
    description: '服务健康',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        timestamp: { type: 'string', example: '2024-01-01T00:00:00.000Z' },
        uptime: { type: 'number', example: 3600 },
        database: { type: 'string', example: 'connected' },
        redis: { type: 'string', example: 'connected' },
      },
    },
  })
  async check() {
    return this.healthService.check();
  }
}

// src/health/health.service.ts
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

// src/app.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './common/decorators';

@ApiTags('应用')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: '获取应用信息' })
  getAppInfo() {
    return this.appService.getAppInfo();
  }
}

// src/app.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo() {
    return {
      name: '自媒体多账号管理系统 - 用户认证服务',
      version: '1.0.0',
      description: '提供用户注册、登录、JWT认证等功能',
      timestamp: new Date().toISOString(),
    };
  }
}

// src/users/users.controller.ts
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  // 用户相关的其他接口可以在这里添加
  // 如：获取用户列表、管理员功能等
}