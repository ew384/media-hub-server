// src/subscription/subscription.controller.ts
import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Query, 
  UseGuards, 
  HttpCode,
  HttpStatus,
  Req
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { PreviewSubscriptionDto } from './dto/preview-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';

@ApiTags('subscription')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: '获取所有会员套餐' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPlans() {
    const data = await this.subscriptionService.getPlans();
    return {
      code: 200,
      message: '获取成功',
      data
    };
  }

  @Get('status')
  @ApiOperation({ summary: '获取当前用户会员状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSubscriptionStatus(@CurrentUser() user) {
    const data = await this.subscriptionService.getSubscriptionStatus(user.id);
    return {
      code: 200,
      message: '获取成功',
      data
    };
  }

  @Get('history')
  @ApiOperation({ summary: '获取订阅历史' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSubscriptionHistory(
    @CurrentUser() user,
    @Query() query: SubscriptionQueryDto,
  ) {
    const data = await this.subscriptionService.getSubscriptionHistory(user.id, query);
    return {
      code: 200,
      message: '获取成功',
      data
    };
  }

  @Post('preview')
  @ApiOperation({ summary: '预览订阅（计算价格、到期时间）' })
  @ApiResponse({ status: 200, description: '预览成功' })
  @HttpCode(HttpStatus.OK)
  async previewSubscription(
    @CurrentUser() user,
    @Body() previewDto: PreviewSubscriptionDto,
  ) {
    const data = await this.subscriptionService.previewSubscription(user.id, previewDto);
    return {
      code: 200,
      message: '预览成功',
      data
    };
  }

  @Post()
  @ApiOperation({ summary: '创建订阅' })
  @ApiResponse({ status: 201, description: '订阅创建成功' })
  async createSubscription(
    @CurrentUser() user,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    const data = await this.subscriptionService.createSubscription(user.id, createDto);
    return {
      code: 201,
      message: '订阅创建成功',
      data
    };
  }

  @Put('cancel-auto-renew')
  @ApiOperation({ summary: '取消自动续费' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @HttpCode(HttpStatus.OK)
  async cancelAutoRenew(@CurrentUser() user) {
    await this.subscriptionService.cancelAutoRenew(user.id);
    return {
      code: 200,
      message: '自动续费已取消'
    };
  }

  @Put('resume-auto-renew')
  @ApiOperation({ summary: '恢复自动续费' })
  @ApiResponse({ status: 200, description: '恢复成功' })
  @HttpCode(HttpStatus.OK)
  async resumeAutoRenew(@CurrentUser() user) {
    await this.subscriptionService.resumeAutoRenew(user.id);
    return {
      code: 200,
      message: '自动续费已恢复'
    };
  }
}