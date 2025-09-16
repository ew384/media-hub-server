// src/content/content.controller.ts
import { Controller, Post, Get, Body, UseGuards, Request } from '@nestjs/common';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { CheckSubscription } from '../permissions/decorators/check-subscription.decorator';
import { PermissionGuard } from '../permissions/guards/permission.guard';
import { SubscriptionGuard } from '../permissions/guards/subscription.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('content')
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * 发布内容 - 需要发布权限
   */
  @Post('publish')
  @UseGuards(PermissionGuard)
  @RequirePermission('publish')
  async publishContent(@Request() req, @Body() contentDto: any) {
    // 增加使用次数
    await this.permissionsService.incrementFeatureUsage(req.user.id, 'publish');
    
    // 发布逻辑
    return {
      code: 200,
      message: '内容发布成功',
      data: { id: 'content_123' }
    };
  }

  /**
   * 获取聚合消息 - 需要聚合权限
   */
  @Get('messages')
  @UseGuards(PermissionGuard)
  @RequirePermission('aggregate')
  async getAggregatedMessages(@Request() req) {
    // 聚合消息逻辑
    return {
      code: 200,
      message: '获取成功',
      data: { messages: [] }
    };
  }

  /**
   * VIP功能 - 需要VIP权限
   */
  @Get('vip-features')
  @UseGuards(PermissionGuard)
  @RequirePermission('vip_group')
  async getVipFeatures(@Request() req) {
    return {
      code: 200,
      message: '获取VIP功能成功',
      data: { features: ['advanced_analytics', 'priority_support'] }
    };
  }

  /**
   * 基础功能 - 只需要有效订阅
   */
  @Get('basic')
  @UseGuards(SubscriptionGuard)
  @CheckSubscription()
  async getBasicFeatures(@Request() req) {
    return {
      code: 200,
      message: '获取基础功能成功',
      data: { subscription: req.subscription }
    };
  }
}
