// src/subscription/dto/subscription-query.dto.ts
import { IsOptional, IsNumber, IsString, IsIn, Min } from 'class-validator';
import { Transform } from 'class-transformer';
import { SubscriptionStatus } from '../constants/subscription.constants';

export class SubscriptionQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber()
  @IsIn(Object.values(SubscriptionStatus))
  status?: number;

  @IsOptional()
  @IsString()
  planId?: string;
}