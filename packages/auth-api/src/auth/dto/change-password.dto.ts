// packages/auth-api/src/auth/dto/change-password.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
  @ApiPropertyOptional({
    description: '当前密码（如果已设置密码）',
    example: 'oldPassword123',
  })
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @ApiProperty({
    description: '新密码',
    example: 'newPassword123!',
  })
  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(50, { message: '密码最多50位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  newPassword: string;
}