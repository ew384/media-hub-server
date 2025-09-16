// src/payment/dto/create-order.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PAYMENT_METHOD } from '../constants/payment.constants';

export class CreateOrderDto {
  @IsString()
  @IsEnum(['monthly', 'quarterly', 'yearly'])
  planId: string;

  @IsString()
  @IsEnum([PAYMENT_METHOD.ALIPAY, PAYMENT_METHOD.WECHAT])
  paymentMethod: string;

  @IsOptional()
  @IsString()
  couponCode?: string;
}

