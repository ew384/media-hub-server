// packages/payment-api/src/payment/dto/refund.dto.ts
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ description: '订单号' })
  @IsString()
  orderNo: string;

  @ApiProperty({ description: '退款原因', required: false })
  @IsOptional()
  @IsString()
  refundReason?: string;

  @ApiProperty({ description: '退款金额（如果不填则全额退款）', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  refundAmount?: number;
}
