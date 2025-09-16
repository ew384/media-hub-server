// src/subscription/subscription.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { PreviewSubscriptionDto } from './dto/preview-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('subscription')
@Controller('subscription')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('plans')
  @ApiOperation({ summary: '获取套餐列表' })
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
  async getSubscriptionStatus(@Request() req) {
    const data = await this.subscriptionService.getSubscriptionStatus(req.user.id);
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
    @Request() req,
    @Query() query: SubscriptionQueryDto,
  ) {
    const data = await this.subscriptionService.getSubscriptionHistory(req.user.id, query);
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
    @Request() req,
    @Body() previewDto: PreviewSubscriptionDto,
  ) {
    const data = await this.subscriptionService.previewSubscription(req.user.id, previewDto);
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
    @Request() req,
    @Body() createDto: CreateSubscriptionDto,
  ) {
    const data = await this.subscriptionService.createSubscription(req.user.id, createDto);
    return {
      code: 201,
      message: '订阅创建成功',
      data
    };
  }

  @Put('cancel')
  @ApiOperation({ summary: '取消自动续费' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @HttpCode(HttpStatus.OK)
  async cancelAutoRenew(@Request() req) {
    await this.subscriptionService.cancelAutoRenew(req.user.id);
    return {
      code: 200,
      message: '自动续费已取消'
    };
  }

  @Put('resume')
  @ApiOperation({ summary: '恢复自动续费' })
  @ApiResponse({ status: 200, description: '恢复成功' })
  @HttpCode(HttpStatus.OK)
  async resumeAutoRenew(@Request() req) {
    await this.subscriptionService.resumeAutoRenew(req.user.id);
    return {
      code: 200,
      message: '自动续费已恢复'
    };
  }
}