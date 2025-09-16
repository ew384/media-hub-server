// src/payment/dto/refund.dto.ts
export class CreateRefundDto {
  @IsString()
  orderNo: string;

  @IsOptional()
  @IsString()
  refundReason?: string;
}
