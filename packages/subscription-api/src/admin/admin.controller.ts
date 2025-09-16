// src/admin/admin.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UpdateSubscriptionDto } from '../subscription/dto/update-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard'; // 需要创建管理员权限守卫

@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly subscriptionService: SubscriptionService,
    private readonly permissionsService: PermissionsService,
  ) {}

  @Put('subscription/:userId')
  @ApiOperation({ summary: '手动修改用户会员状态' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @HttpCode(HttpStatus.OK)
  async updateUserSubscription(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateDto: UpdateSubscriptionDto,
  ) {
    const data = await this.subscriptionService.updateSubscriptionByAdmin(userId, updateDto);
    
    // 清除用户权限缓存
    await this.permissionsService.clearUserPermissionsCache(userId);
    
    return {
      code: 200,
      message: '用户订阅状态已更新',
      data
    };
  }

  @Get('subscriptions/expiring')
  @ApiOperation({ summary: '获取即将过期的订阅' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getExpiringSubscriptions(@Query('days', ParseIntPipe) days: number = 7) {
    const data = await this.subscriptionService.getExpiringSubscriptions(days);
    return {
      code: 200,
      message: '获取即将过期订阅成功',
      data
    };
  }

  @Post('subscription/extend')
  @ApiOperation({ summary: '延长会员时间' })
  @ApiResponse({ status: 200, description: '延长成功' })
  async extendSubscription(
    @Body() body: { userId: number; days: number },
  ) {
    const data = await this.subscriptionService.extendSubscription(body.userId, body.days);
    
    // 清除用户权限缓存
    await this.permissionsService.clearUserPermissionsCache(body.userId);
    
    return {
      code: 200,
      message: '会员时间已延长',
      data
    };
  }

  @Get('subscriptions/stats')
  @ApiOperation({ summary: '获取订阅统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSubscriptionStats() {
    const data = await this.subscriptionService.getSubscriptionStats();
    return {
      code: 200,
      message: '获取统计数据成功',
      data
    };
  }

  @Post('permissions/refresh-all')
  @ApiOperation({ summary: '刷新所有用户权限缓存' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  async refreshAllPermissions() {
    const refreshedCount = await this.permissionsService.refreshAllPermissionsCache();
    return {
      code: 200,
      message: `已刷新 ${refreshedCount} 个用户的权限缓存`
    };
  }

  @Post('subscriptions/process-expired')
  @ApiOperation({ summary: '手动处理过期订阅' })
  @ApiResponse({ status: 200, description: '处理成功' })
  async processExpiredSubscriptions() {
    const processedCount = await this.subscriptionService.handleExpiredSubscriptions();
    return {
      code: 200,
      message: `已处理 ${processedCount} 个过期订阅`
    };
  }

  @Get('users/:userId/subscription')
  @ApiOperation({ summary: '获取指定用户的订阅信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserSubscription(@Param('userId', ParseIntPipe) userId: number) {
    const data = await this.subscriptionService.getSubscriptionStatus(userId);
    return {
      code: 200,
      message: '获取用户订阅信息成功',
      data
    };
  }

  @Get('users/:userId/permissions')
  @ApiOperation({ summary: '获取指定用户的权限信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserPermissions(@Param('userId', ParseIntPipe) userId: number) {
    const data = await this.permissionsService.getUserPermissions(userId);
    return {
      code: 200,
      message: '获取用户权限信息成功',
      data
    };
  }

  @Post('users/:userId/permissions/clear-cache')
  @ApiOperation({ summary: '清除指定用户的权限缓存' })
  @ApiResponse({ status: 200, description: '清除成功' })
  async clearUserPermissionsCache(@Param('userId', ParseIntPipe) userId: number) {
    await this.permissionsService.clearUserPermissionsCache(userId);
    return {
      code: 200,
      message: '用户权限缓存已清除'
    };
  }
}