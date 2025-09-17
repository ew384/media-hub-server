// packages/payment-api/src/payment/controllers/admin-payment.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentService } from '../payment.service';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { CreateRefundDto, QueryOrdersDto } from '../dto';

interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

@ApiTags('admin-payment')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/payment')
export class AdminPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get('orders')
  @ApiOperation({ summary: '管理员查看所有订单' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getAllOrders(@Query() query: QueryOrdersDto): Promise<ApiResponse<any>> {
    // 这里需要实现管理员查看所有订单的方法
    // 暂时返回空实现，可以后续扩展
    return {
      code: 200,
      message: '功能开发中',
      data: { list: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
    };
  }

  @Get('orders/:orderNo')
  @ApiOperation({ summary: '管理员查看订单详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getOrderDetail(@Param('orderNo') orderNo: string): Promise<ApiResponse<any>> {
    const data = await this.paymentService.getOrderStatus(orderNo);
    return {
      code: 200,
      message: '获取成功',
      data,
    };
  }

  @Post('refunds')
  @ApiOperation({ summary: '管理员创建退款' })
  @ApiResponse({ status: 201, description: '退款申请已提交' })
  async createRefund(@Body() createRefundDto: CreateRefundDto): Promise<ApiResponse<any>> {
    const data = await this.paymentService.createRefund(createRefundDto);
    return {
      code: 201,
      message: '退款申请已提交',
      data,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: '支付统计数据' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPaymentStatistics(): Promise<ApiResponse<any>> {
    // 这里可以实现支付统计功能
    return {
      code: 200,
      message: '功能开发中',
      data: {
        totalOrders: 0,
        totalAmount: 0,
        todayOrders: 0,
        todayAmount: 0,
      },
    };
  }
}
