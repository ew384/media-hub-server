import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: '注册类型',
    enum: ['phone', 'email'],
    example: 'phone',
  })
  @IsString()
  @IsIn(['phone', 'email'], { message: 'type 必须是 phone 或 email' })
  type: 'phone' | 'email';

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  @ValidateIf((o) => o.type === 'phone')
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @ValidateIf((o) => o.type === 'email')
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiPropertyOptional({
    description: '密码（邮箱注册时必填）',
    example: 'password123',
  })
  @ValidateIf((o) => o.type === 'email')
  @IsString()
  @MinLength(8, { message: '密码至少8位' })
  @MaxLength(50, { message: '密码最多50位' })
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  password?: string;

  @ApiPropertyOptional({
    description: '短信验证码（手机注册时必填）',
    example: '123456',
  })
  @ValidateIf((o) => o.type === 'phone')
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  smsCode?: string;

  @ApiProperty({
    description: '用户名',
    example: '张三',
  })
  @IsString()
  @IsNotEmpty({ message: '用户名不能为空' })
  @MinLength(2, { message: '用户名至少2位' })
  @MaxLength(20, { message: '用户名最多20位' })
  username: string;
}

export class LoginDto {
  @ApiProperty({
    description: '登录类型',
    enum: ['phone', 'email'],
    example: 'phone',
  })
  @IsString()
  @IsIn(['phone', 'email'], { message: 'type 必须是 phone 或 email' })
  type: 'phone' | 'email';

  @ApiPropertyOptional({
    description: '手机号码',
    example: '13800138000',
  })
  @ValidateIf((o) => o.type === 'phone')
  @IsString()
  @Matches(/^1[3-9]\d{9}$/, { message: '请输入有效的手机号码' })
  phone?: string;

  @ApiPropertyOptional({
    description: '邮箱地址',
    example: 'user@example.com',
  })
  @ValidateIf((o) => o.type === 'email')
  @IsEmail({}, { message: '请输入有效的邮箱地址' })
  email?: string;

  @ApiPropertyOptional({
    description: '密码（邮箱登录时必填）',
    example: 'password123',
  })
  @ValidateIf((o) => o.type === 'email')
  @IsString()
  @IsNotEmpty({ message: '密码不能为空' })
  password?: string;

  @ApiPropertyOptional({
    description: '短信验证码（手机登录时必填）',
    example: '123456',
  })
  @ValidateIf((o) => o.type === 'phone')
  @IsString()
  @Matches(/^\d{6}$/, { message: '验证码必须是6位数字' })
  smsCode?: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh Token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty({ message: 'refresh token 不能为空' })
  refreshToken: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({
    description: '用户名',
    example: '李四',
  })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '用户名至少2位' })
  @MaxLength(20, { message: '用户名最多20位' })
  username?: string;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255, { message: '头像URL最多255位' })
  avatarUrl?: string;
}
// 🔥 新增：更换手机号DTO
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

// 🔥 新增：修改密码DTO
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

// 响应DTO
export class UserResponseDto {
  @ApiProperty({ description: '用户ID', example: 1 })
  id: number;

  @ApiProperty({ description: '用户名', example: '张三' })
  username: string;

  @ApiPropertyOptional({ description: '手机号码（脱敏）', example: '138****8000' })
  phone?: string;

  @ApiPropertyOptional({ description: '邮箱地址（脱敏）', example: 'u***@example.com' })
  email?: string;

  @ApiPropertyOptional({ description: '头像URL' })
  avatarUrl?: string;

  @ApiProperty({ description: '用户状态', example: 1 })
  status: number;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}

export class AuthResponseDto {
  @ApiProperty({ description: '用户信息', type: UserResponseDto })
  user: UserResponseDto;

  @ApiProperty({ description: 'Access Token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ description: 'Refresh Token', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;
}
export * from './wechat.dto';