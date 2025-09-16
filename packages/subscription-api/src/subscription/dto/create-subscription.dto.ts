// src/subscription/dto/create-subscription.dto.ts
import { IsString, IsNumber, IsOptional, IsBoolean, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ description: '套餐ID' })
  @IsString()
  planId: string;

  @ApiProperty({ description: '实付金额' })
  @IsNumber()
  paidPrice: number;

  @ApiProperty({ description: '开始日期', required: false })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({ description: '是否自动续费', default: false })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}
