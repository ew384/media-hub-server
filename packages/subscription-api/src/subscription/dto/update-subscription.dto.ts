// src/subscription/dto/update-subscription.dto.ts
import { IsBoolean, IsOptional, IsIn, IsNumber } from 'class-validator';
import { SubscriptionStatus } from '../constants/subscription.constants';

export class UpdateSubscriptionDto {
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @IsNumber()
  @IsIn(Object.values(SubscriptionStatus))
  status?: number;
}
