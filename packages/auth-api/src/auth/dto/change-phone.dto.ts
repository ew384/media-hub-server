// packages/auth-api/src/auth/dto/change-phone.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, Matches, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * 更换手机号DTO
 */
export class ChangePhoneDto {
  @ApiProperty({
    description: '新手机号',
    example: '13800138001',
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  newPhone: string;

  @ApiProperty({
    description: '新手机号验证码',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  newPhoneCode: string;

  @ApiPropertyOptional({
    description: '原手机号验证码（如果已绑定手机号）',
    example: '654321',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  oldPhoneCode?: string;
}

/**
 * 修改密码DTO
 */
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