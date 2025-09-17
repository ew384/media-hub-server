// packages/payment-api/src/payment/controllers/payment.controller.ts
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
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { PaymentService } from '../payment.service';
import { AuthGuard } from '../../auth/guards/auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Public } from '../../auth/decorators/public.decorator';
import { CreateOrderDto, QueryOrdersDto, CreateRefundDto } from '../dto';

interface ApiResponse<T> {
  code: number;
  message: string;
  data?: T;
}

@ApiTags('payment')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('orders')
  @ApiOperation({ summary: '创建支付订单' })
  @ApiResponse({ status: 201, description: '订单创建成功' })
  async createOrder(
    @CurrentUser() user: any,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.paymentService.createOrder(user.id, createOrderDto);
    return {
      code: 201,
      message: '订单创建成功',
      data,
    };
  }

  @Get('orders/:orderNo')
  @ApiOperation({ summary: '查询订单状态' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getOrderStatus(@Param('orderNo') orderNo: string): Promise<ApiResponse<any>> {
    const data = await this.paymentService.getOrderStatus(orderNo);
    return {
      code: 200,
      message: '查询成功',
      data,
    };
  }

  @Get('orders')
  @ApiOperation({ summary: '获取用户订单列表' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserOrders(
    @CurrentUser() user: any,
    @Query() query: QueryOrdersDto,
  ): Promise<ApiResponse<any>> {
    const data = await this.paymentService.getUserOrders(user.id, query);
    return {
      code: 200,
      message: '获取成功',
      data,
    };
  }

  @Put('orders/:orderNo/cancel')
  @ApiOperation({ summary: '取消订单' })
  @ApiResponse({ status: 200, description: '取消成功' })
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @CurrentUser() user: any,
    @Param('orderNo') orderNo: string,
  ): Promise<ApiResponse<any>> {
    const data = await this.paymentService.cancelOrder(orderNo, user.id);
    return {
      code: 200,
      message: '订单已取消',
      data,
    };
  }

  @Post('refunds')
  @ApiOperation({ summary: '申请退款' })
  @ApiResponse({ status: 201, description: '退款申请已提交' })
  async createRefund(@Body() createRefundDto: CreateRefundDto): Promise<ApiResponse<any>> {
    const data = await this.paymentService.createRefund(createRefundDto);
    return {
      code: 201,
      message: '退款申请已提交',
      data,
    };
  }

  // 支付回调接口（公开）
  @Public()
  @Post('callback/alipay')
  @ApiOperation({ summary: '支付宝支付回调' })
  @HttpCode(HttpStatus.OK)
  async alipayCallback(@Body() callbackData: any, @Res() res: Response) {
    try {
      const result = await this.paymentService.handleAlipayCallback(callbackData);
      res.send(result);
    } catch (error) {
      res.send('fail');
    }
  }

  @Public()
  @Post('callback/wechat')
  @ApiOperation({ summary: '微信支付回调' })
  @HttpCode(HttpStatus.OK)
  async wechatCallback(@Body() callbackData: any, @Res() res: Response) {
    try {
      const result = await this.paymentService.handleWechatCallback(callbackData);
      res.set('Content-Type', 'text/xml');
      res.send(result);
    } catch (error) {
      res.set('Content-Type', 'text/xml');
      res.send('<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[ERROR]]></return_msg></xml>');
    }
  }
}
