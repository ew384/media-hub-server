import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import axios from 'axios'; 
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { 
  RegisterDto, 
  LoginDto, 
  AuthResponseDto, 
  UserResponseDto,  
  WechatLoginDto, 
  WechatBindDto,
  WechatLoginUrlDto,
  WechatBindStatusDto
  } from './dto';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly maxLoginAttempts: number;
  private readonly loginAttemptWindow: number;
  private readonly wechatConfig: {
    appId: string;
    appSecret: string;
    redirectUrl: string;
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {
    this.saltRounds = this.configService.get('BCRYPT_SALT_ROUNDS', 12);
    this.maxLoginAttempts = this.configService.get('MAX_LOGIN_ATTEMPTS', 5);
    this.loginAttemptWindow = this.configService.get('LOGIN_ATTEMPT_WINDOW', 3600);
    // 🔥 初始化微信配置
    this.wechatConfig = {
      appId: this.configService.get('WECHAT_APPID', ''),
      appSecret: this.configService.get('WECHAT_APPSECRET', ''),
      redirectUrl: this.configService.get('WECHAT_REDIRECT_URL', 'http://localhost:3409/#/login/callback'),
    };
  }
  /**
   * 获取微信登录URL
   */
  async getWechatLoginUrl(redirectUrl?: string, ip?: string): Promise<WechatLoginUrlDto> {
    try {
      // 生成随机state参数（防CSRF攻击）
      const state = crypto.randomBytes(16).toString('hex');
      
      // 构建微信登录URL
      const finalRedirectUrl = encodeURIComponent(
        redirectUrl || this.wechatConfig.redirectUrl
      );
      
      const wechatLoginUrl = 
        `https://open.weixin.qq.com/connect/qrconnect?` +
        `appid=${this.wechatConfig.appId}&` +
        `redirect_uri=${finalRedirectUrl}&` +
        `response_type=code&` +
        `scope=snsapi_login&` +
        `state=${state}#wechat_redirect`;
      
      // 可选：将state保存到Redis或数据库中，用于后续验证
      // await this.cacheService.set(`wechat_state:${state}`, ip, 600); // 10分钟过期
      
      console.log('📱 生成微信登录URL:', { 
        state, 
        redirectUrl: finalRedirectUrl,
        appId: this.wechatConfig.appId 
      });
      
      return {
        success: true,
        data: {
          loginUrl: wechatLoginUrl,
          state: state,
        },
      };
      
    } catch (error) {
      console.error('❌ 生成微信登录URL失败:', error);
      throw new BadRequestException('生成微信登录URL失败');
    }
  }

  /**
   * 微信登录
   */
  async wechatLogin(dto: WechatLoginDto, ip: string): Promise<AuthResponseDto> {
    try {
      const { code, state } = dto;
      
      console.log('🔐 处理微信登录:', { code, state });
      
      // 1. 验证state参数（可选，如果你使用了缓存存储）
      // const savedState = await this.cacheService.get(`wechat_state:${state}`);
      // if (!savedState) {
      //   throw new UnauthorizedException('Invalid state parameter');
      // }
      
      // 2. 使用code换取access_token
      const tokenResponse = await axios.get(
        `https://api.weixin.qq.com/sns/oauth2/access_token?` +
        `appid=${this.wechatConfig.appId}&` +
        `secret=${this.wechatConfig.appSecret}&` +
        `code=${code}&` +
        `grant_type=authorization_code`,
        { timeout: 10000 }
      );
      
      const tokenData = tokenResponse.data;
      console.log('🔑 微信Token响应:', {
        hasAccessToken: !!tokenData.access_token,
        openid: tokenData.openid,
        errcode: tokenData.errcode
      });
      
      if (tokenData.errcode) {
        throw new UnauthorizedException(`微信授权失败: ${tokenData.errmsg}`);
      }
      
      const { access_token, openid, unionid } = tokenData;
      
      // 3. 获取用户信息
      const userResponse = await axios.get(
        `https://api.weixin.qq.com/sns/userinfo?` +
        `access_token=${access_token}&` +
        `openid=${openid}`,
        { timeout: 10000 }
      );
      
      const wechatUser = userResponse.data;
      console.log('👤 微信用户信息:', { 
        nickname: wechatUser.nickname, 
        openid: wechatUser.openid,
        errcode: wechatUser.errcode
      });
      
      if (wechatUser.errcode) {
        throw new UnauthorizedException(`获取用户信息失败: ${wechatUser.errmsg}`);
      }
      
      // 4. 查找或创建用户
      let user = await this.findUserByWechatId(unionid || openid);
      
      if (!user) {
        // 创建新用户
        user = await this.createUserFromWechat(wechatUser, unionid || openid);
        console.log('✨ 创建新用户:', user.id);
      } else {
        // 更新用户微信信息
        await this.updateUserWechatInfo(user.id, wechatUser);
        console.log('🔄 更新用户信息:', user.id);
      }
      
      // 5. 生成JWT token
      const tokens = await this.generateTokens(user.id);
      
      // 6. 记录登录成功
      await this.recordLoginAttempt(openid, ip, true);
      
      return {
        user: this.sanitizeUser(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
      
    } catch (error) {
      console.error('❌ 微信登录失败:', error);
      
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('微信登录失败，请重试');
    }
  }

  /**
   * 绑定微信账号
   */
  async bindWechatAccount(userId: number, dto: WechatBindDto): Promise<{ success: boolean; message: string }> {
    try {
      // 类似微信登录的流程，但是绑定到现有用户
      // 这里简化实现，实际需要完整的微信API调用
      
      // 检查用户是否已绑定微信
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        throw new BadRequestException('用户不存在');
      }
      
      // 这里应该调用微信API获取用户信息，然后更新到数据库
      // 为了演示，先返回成功
      
      return {
        success: true,
        message: '微信账号绑定成功'
      };
      
    } catch (error) {
      console.error('❌ 微信账号绑定失败:', error);
      throw new BadRequestException('微信账号绑定失败');
    }
  }

  /**
   * 解绑微信账号
   */
  async unbindWechatAccount(userId: number): Promise<{ success: boolean; message: string }> {
    try {
      // 从数据库中移除微信绑定信息
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          wechatOpenid: null,
          wechatUnionid: null,
          wechatNickname: null,
          wechatAvatar: null,
          wechatBoundAt: null,
          updatedAt: new Date(),
        },
      });
      
      return {
        success: true,
        message: '微信账号解绑成功'
      };
      
    } catch (error) {
      console.error('❌ 微信账号解绑失败:', error);
      throw new BadRequestException('微信账号解绑失败');
    }
  }

  /**
   * 获取微信绑定状态
   */
  async getWechatBindStatus(userId: number): Promise<{ success: boolean; data: WechatBindStatusDto }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      
      if (!user) {
        throw new BadRequestException('用户不存在');
      }
      
      // 根据数据库结构返回绑定状态
      const bindStatus: WechatBindStatusDto = {
        isBound: !!(user.wechatOpenid || user.wechatUnionid),
        wechatNickname: user.wechatNickname,
        wechatAvatar: user.wechatAvatar,
        boundAt: user.wechatBoundAt?.toISOString(),
      };
      
      return {
        success: true,
        data: bindStatus
      };
      
    } catch (error) {
      console.error('❌ 获取微信绑定状态失败:', error);
      throw new BadRequestException('获取微信绑定状态失败');
    }
  }

  // 🔥 私有辅助方法

  /**
   * 根据微信ID查找用户
   */
  private async findUserByWechatId(wechatId: string) {
    return await this.prisma.user.findFirst({
      where: {
        OR: [
          { wechatOpenid: wechatId },
          { wechatUnionid: wechatId },
        ],
      },
    });
  }

  /**
   * 从微信信息创建新用户
   */
  private async createUserFromWechat(wechatUser: any, wechatId: string) {
    const userData = {
      username: this.generateUniqueUsername(wechatUser.nickname),
      wechatOpenid: wechatUser.openid,
      wechatUnionid: wechatUser.unionid || wechatUser.openid,
      wechatNickname: wechatUser.nickname,
      wechatAvatar: wechatUser.headimgurl,
      wechatBoundAt: new Date(),
      avatarUrl: wechatUser.headimgurl,
      status: 1,
    };
    
    return await this.prisma.user.create({ data: userData });
  }

  /**
   * 更新用户微信信息
   */
  private async updateUserWechatInfo(userId: number, wechatUser: any) {
    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        wechatNickname: wechatUser.nickname,
        wechatAvatar: wechatUser.headimgurl,
        avatarUrl: wechatUser.headimgurl,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * 生成唯一用户名
   */
  private generateUniqueUsername(nickname: string): string {
    // 移除特殊字符，保留中文、英文、数字
    const cleanNickname = nickname.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    const randomSuffix = Math.random().toString(36).substr(2, 6);
    return `${cleanNickname}_${randomSuffix}`.substr(0, 20);
  }
  /**
   * 用户注册
   */
  async register(dto: RegisterDto, ip: string): Promise<AuthResponseDto> {
    // 验证短信验证码（手机注册）
    if (dto.type === 'phone') {
      const isValidCode = await this.smsService.verifyCode(
        dto.phone!,
        dto.smsCode!,
        'register',
      );
      if (!isValidCode) {
        throw new BadRequestException('验证码无效或已过期');
      }
    }

    // 检查用户是否已存在
    await this.checkUserExists(dto);

    // 创建用户
    const userData: any = {
      username: dto.username,
      status: 1,
    };

    if (dto.type === 'phone') {
      userData.phone = dto.phone;
    } else {
      userData.email = dto.email;
      userData.passwordHash = await this.hashPassword(dto.password!);
    }

    const user = await this.prisma.user.create({ data: userData });

    // 生成令牌
    const tokens = await this.generateTokens(user.id);

    // 记录登录成功
    await this.recordLoginAttempt(dto.phone || dto.email!, ip, true);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto, ip: string): Promise<AuthResponseDto> {
    const identifier = dto.phone || dto.email!;

    // 检查登录尝试次数
    await this.checkLoginAttempts(identifier, ip);

    let user;

    if (dto.type === 'phone') {
      // 验证短信验证码
      const isValidCode = await this.smsService.verifyCode(
        dto.phone!,
        dto.smsCode!,
        'login',
      );
      if (!isValidCode) {
        await this.recordLoginAttempt(identifier, ip, false);
        throw new UnauthorizedException('验证码无效或已过期');
      }

      // 查找用户
      user = await this.prisma.user.findUnique({
        where: { phone: dto.phone },
      });
    } else {
      // 邮箱密码登录
      user = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });

      if (!user || !await this.validatePassword(dto.password!, user.passwordHash!)) {
        await this.recordLoginAttempt(identifier, ip, false);
        throw new UnauthorizedException('邮箱或密码错误');
      }
    }

    if (!user) {
      await this.recordLoginAttempt(identifier, ip, false);
      throw new UnauthorizedException('用户不存在');
    }

    if (user.status !== 1) {
      await this.recordLoginAttempt(identifier, ip, false);
      throw new ForbiddenException('账号已被禁用');
    }

    // 生成令牌
    const tokens = await this.generateTokens(user.id);

    // 记录登录成功
    await this.recordLoginAttempt(identifier, ip, true);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 刷新令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    // 验证刷新令牌
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token 无效或已过期');
    }

    // 删除旧的刷新令牌
    await this.prisma.refreshToken.delete({
      where: { id: tokenRecord.id },
    });

    // 生成新的令牌
    const tokens = await this.generateTokens(tokenRecord.userId);

    return {
      user: this.sanitizeUser(tokenRecord.user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * 退出登录
   */
  async logout(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  /**
   * 验证JWT令牌并获取用户信息
   */
  async validateToken(payload: any): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 1) {
      throw new UnauthorizedException('用户不存在或已被禁用');
    }

    return this.sanitizeUser(user);
  }

  /**
   * 生成访问令牌和刷新令牌
   */
  private async generateTokens(userId: number) {
    const payload = { sub: userId, type: 'access' };
    
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = uuid();
    const refreshTokenExpiresIn = this.configService.get('REFRESH_TOKEN_EXPIRES_IN', '30d');
    const expiresAt = new Date();
    
    // 计算刷新令牌过期时间
    const days = parseInt(refreshTokenExpiresIn.replace('d', ''));
    expiresAt.setDate(expiresAt.getDate() + days);

    // 保存刷新令牌
    await this.prisma.refreshToken.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  /**
   * 检查用户是否已存在
   */
  private async checkUserExists(dto: RegisterDto): Promise<void> {
    const conditions = [];

    if (dto.phone) {
      conditions.push({ phone: dto.phone });
    }
    if (dto.email) {
      conditions.push({ email: dto.email });
    }
    conditions.push({ username: dto.username });

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: conditions },
    });

    if (existingUser) {
      if (existingUser.phone === dto.phone) {
        throw new ConflictException('手机号已被注册');
      }
      if (existingUser.email === dto.email) {
        throw new ConflictException('邮箱已被注册');
      }
      if (existingUser.username === dto.username) {
        throw new ConflictException('用户名已被使用');
      }
    }
  }

  /**
   * 检查登录尝试次数
   */
  private async checkLoginAttempts(identifier: string, ip: string): Promise<void> {
    const window = new Date(Date.now() - this.loginAttemptWindow * 1000);

    const attempts = await this.prisma.loginAttempt.count({
      where: {
        OR: [
          { identifier, createdAt: { gte: window } },
          { ip, createdAt: { gte: window } },
        ],
        success: false,
      },
    });

    if (attempts >= this.maxLoginAttempts) {
      throw new ForbiddenException('登录尝试次数过多，请稍后再试');
    }
  }

  /**
   * 记录登录尝试
   */
  private async recordLoginAttempt(
    identifier: string,
    ip: string,
    success: boolean,
  ): Promise<void> {
    await this.prisma.loginAttempt.create({
      data: { identifier, ip, success },
    });
  }

  /**
   * 密码加密
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * 验证密码
   */
  private async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * 脱敏用户信息
   */
  private sanitizeUser(user: any): UserResponseDto {
    const sanitized: any = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 手机号脱敏
    if (user.phone) {
      sanitized.phone = user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    // 邮箱脱敏
    if (user.email) {
      const [username, domain] = user.email.split('@');
      const maskedUsername = username.length > 2
        ? username.charAt(0) + '*'.repeat(username.length - 2) + username.slice(-1)
        : username;
      sanitized.email = `${maskedUsername}@${domain}`;
    }

    return sanitized;
  }
}