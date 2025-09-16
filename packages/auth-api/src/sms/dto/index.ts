import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn, Matches } from 'class-validator';

export class SendSmsDto {
  @ApiProperty({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone: string;

  @ApiProperty({
    description: '短信场景',
    enum: ['register', 'login', 'reset_password'],
    example: 'register',
  })
  @IsString()
  @IsIn(['register', 'login', 'reset_password'], {
    message: 'scene 必须是 register, login 或 reset_password',
  })
  scene: 'register' | 'login' | 'reset_password';
}

export class VerifySmsDto {
  @ApiProperty({
    description: '手机号码',
    example: '13800138000',
  })
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone: string;

  @ApiProperty({
    description: '验证码',
    example: '123456',
  })
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  code: string;

  @ApiProperty({
    description: '短信场景',
    enum: ['register', 'login', 'reset_password'],
    example: 'register',
  })
  @IsString()
  @IsIn(['register', 'login', 'reset_password'], {
    message: 'scene 必须是 register, login 或 reset_password',
  })
  scene: 'register' | 'login' | 'reset_password';
}

export class SmsResponseDto {
  @ApiProperty({
    description: '验证码过期时间（秒）',
    example: 300,
  })
  expireTime: number;
}