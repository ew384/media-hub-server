// packages/auth-api/src/auth/dto/wechat.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 微信登录DTO
 */
export class WechatLoginDto {
  @ApiProperty({
    description: '微信授权码',
    example: 'wx_auth_code_123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({
    description: '状态参数（防CSRF）',
    example: 'random_state_123',
    required: false,
  })
  @IsString()
  @IsOptional()
  state?: string;
}

/**
 * 微信绑定DTO
 */
export class WechatBindDto {
  @ApiProperty({
    description: '微信授权码',
    example: 'wx_auth_code_123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;
}

/**
 * 微信登录URL响应DTO
 */
export class WechatLoginUrlDto {
  @ApiProperty({
    description: '是否成功',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '微信登录数据',
    type: 'object',
    properties: {
      loginUrl: {
        type: 'string',
        description: '微信登录URL',
        example: 'https://open.weixin.qq.com/connect/qrconnect?...',
      },
      state: {
        type: 'string',
        description: '状态参数',
        example: 'random_state_123',
      },
    },
  })
  data: {
    loginUrl: string;
    state: string;
  };
}

/**
 * 微信绑定状态响应DTO
 */
export class WechatBindStatusDto {
  @ApiProperty({
    description: '是否已绑定微信',
    example: true,
  })
  isBound: boolean;

  @ApiProperty({
    description: '微信昵称',
    example: '张三',
    required: false,
  })
  wechatNickname?: string;

  @ApiProperty({
    description: '微信头像URL',
    example: 'https://wx.qlogo.cn/mmopen/...',
    required: false,
  })
  wechatAvatar?: string;

  @ApiProperty({
    description: '绑定时间',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  boundAt?: string;
}

/**
 * 微信用户信息（内部使用）
 */
export interface WechatUserInfo {
  openid: string;
  nickname: string;
  headimgurl: string;
  unionid?: string;
  sex?: number;
  province?: string;
  city?: string;
  country?: string;
}