// src/subscription/dto/preview-subscription.dto.ts
import { IsString, IsIn, IsOptional, IsDateString } from 'class-validator';
import { SUBSCRIPTION_PLANS } from '../constants/subscription.constants';

export class PreviewSubscriptionDto {
  @IsString()
  @IsIn(Object.keys(SUBSCRIPTION_PLANS))
  planId: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}