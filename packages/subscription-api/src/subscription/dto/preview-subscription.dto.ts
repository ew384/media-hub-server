// src/subscription/dto/preview-subscription.dto.ts
import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PreviewSubscriptionDto {
  @ApiProperty({ description: '套餐ID' })
  @IsString()
  planId: string;

  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}