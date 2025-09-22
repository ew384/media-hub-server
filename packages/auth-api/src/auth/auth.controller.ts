import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GetClientIp } from '../common/decorators/get-client-ip.decorator';
import { RawResponse } from '../common/interceptors'; // 导入装饰器
import { Public } from '../common/decorators/public.decorator';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  UpdateProfileDto,
  AuthResponseDto,
  UserResponseDto,
  WechatLoginDto,
  WechatBindDto,
} from './dto';
import { Throttle } from '@nestjs/throttler';
@ApiTags('认证')
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RawResponse() // 跳过响应包装
  @Throttle({ short: { limit: 3, ttl: 60000 } }) // 1分钟最多3次注册
  @ApiOperation({ summary: '用户注册' })
  async register(
    @Body() registerDto: RegisterDto,
    @GetClientIp() ip: string,
  ): Promise<AuthResponseDto> {
    return this.authService.register(registerDto, ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RawResponse() // 跳过响应包装
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '用户登录' })
  async login(
    @Body() loginDto: LoginDto,
    @GetClientIp() ip: string,
  ): Promise<AuthResponseDto> {
    return this.authService.login(loginDto, ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @RawResponse() // 跳过响应包装
  @ApiOperation({ summary: '刷新访问令牌' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '用户退出登录' })
  async logout(@Req() req: Request): Promise<void> {
    const refreshToken = req.body?.refreshToken;
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @RawResponse() // 跳过响应包装 
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取当前用户信息' })
  async getProfile(@CurrentUser() user: UserResponseDto): Promise<UserResponseDto> {
    return this.usersService.findById(user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @RawResponse() // 跳过响应包装
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '更新当前用户信息' })
  async updateProfile(
    @CurrentUser() user: UserResponseDto,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  /**
   * 获取微信登录URL
   */
  @Get('wechat/login-url')
  @Public()
  @RawResponse()
  @ApiOperation({ summary: '获取微信登录URL' })
  @ApiResponse({
    status: 200,
    description: '微信登录URL生成成功',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            loginUrl: { type: 'string' },
            state: { type: 'string' }
          }
        }
      }
    }
  })
  async getWechatLoginUrl(
    @Query('redirect_url') redirectUrl?: string,
    @GetClientIp() ip?: string,
  ) {
    return this.authService.getWechatLoginUrl(redirectUrl, ip);
  }

  /**
   * 微信登录
   */
  @Post('wechat/login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @RawResponse()
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: '微信登录' })
  @ApiResponse({
    status: 200,
    description: '微信登录成功',
    type: AuthResponseDto,
  })
  async wechatLogin(
    @Body() wechatLoginDto: WechatLoginDto,
    @GetClientIp() ip: string,
  ): Promise<AuthResponseDto> {
    return this.authService.wechatLogin(wechatLoginDto, ip);
  }

  /**
   * 绑定微信账号
   */
  @Post('wechat/bind')
  @UseGuards(JwtAuthGuard)
  @RawResponse()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '绑定微信账号' })
  async bindWechatAccount(
    @CurrentUser() user: UserResponseDto,
    @Body() wechatBindDto: WechatBindDto,
  ) {
    return this.authService.bindWechatAccount(user.id, wechatBindDto);
  }

  /**
   * 解绑微信账号
   */
  @Post('wechat/unbind')
  @UseGuards(JwtAuthGuard)
  @RawResponse()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '解绑微信账号' })
  async unbindWechatAccount(@CurrentUser() user: UserResponseDto) {
    return this.authService.unbindWechatAccount(user.id);
  }

  /**
   * 获取微信绑定状态
   */
  @Get('wechat/bind-status')
  @UseGuards(JwtAuthGuard)
  @RawResponse()
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: '获取微信绑定状态' })
  async getWechatBindStatus(@CurrentUser() user: UserResponseDto) {
    return this.authService.getWechatBindStatus(user.id);
  }
}