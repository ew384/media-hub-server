// src/subscription/dto/create-subscription.dto.ts
import { IsString, IsNumber, IsBoolean, IsOptional, IsIn, IsDateString, Min } from 'class-validator';
import { SUBSCRIPTION_PLANS } from '../constants/subscription.constants';

export class CreateSubscriptionDto {
  @IsString()
  @IsIn(Object.keys(SUBSCRIPTION_PLANS))
  planId: string;

  @IsNumber()
  @Min(0)
  paidPrice: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean = false;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}