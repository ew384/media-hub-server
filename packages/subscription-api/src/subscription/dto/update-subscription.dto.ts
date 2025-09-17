// src/subscription/dto/update-subscription.dto.ts
import { IsOptional, IsNumber, IsDateString, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSubscriptionDto {
  @ApiProperty({ description: '订阅状态', required: false })
  @IsOptional()
  @IsNumber()
  status?: number;

  @ApiProperty({ description: '结束日期', required: false })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({ description: '自动续费', required: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}