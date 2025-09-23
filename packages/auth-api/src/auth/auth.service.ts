import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
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
  ChangePhoneDto, 
  ChangePasswordDto,
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
   * 更换手机号
   */
  async changePhone(userId: number, changePhoneDto: ChangePhoneDto): Promise<UserResponseDto> {
    const { newPhone, newPhoneCode, oldPhoneCode } = changePhoneDto;
    
    try {
      // 1. 验证新手机号验证码
      const isNewPhoneValid = await this.smsService.verifyCode(
        newPhone, 
        newPhoneCode, 
        'register'
      );
      if (!isNewPhoneValid) {
        throw new BadRequestException('新手机号验证码无效或已过期');
      }

      // 2. 检查新手机号是否已被占用
      const existingUser = await this.prisma.user.findFirst({
        where: { 
          phone: newPhone,
          NOT: { id: userId }
        }
      });
      if (existingUser) {
        throw new ConflictException('该手机号已被其他用户使用');
      }

      // 3. 获取当前用户信息
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      if (!currentUser) {
        throw new NotFoundException('用户不存在');
      }

      // 4. 如果已绑定手机号，需要验证原手机号验证码
      if (currentUser.phone && !oldPhoneCode) {
        throw new BadRequestException('请先验证原手机号');
      }
      
      if (currentUser.phone && oldPhoneCode) {
        const isOldPhoneValid = await this.smsService.verifyCode(
          currentUser.phone,
          oldPhoneCode,
          'register'
        );
        if (!isOldPhoneValid) {
          throw new BadRequestException('原手机号验证码无效或已过期');
        }
      }

      // 5. 更新手机号
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { 
          phone: newPhone,
          updatedAt: new Date()
        }
      });

      // 6. 返回脱敏后的用户信息（复用现有逻辑）
      return this.sanitizeUser(updatedUser);

    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof ConflictException || 
          error instanceof NotFoundException) {
        throw error;
      }
      console.error('更换手机号失败:', error);
      throw new InternalServerErrorException('更换手机号失败，请稍后重试');
    }
  }



  /**
   * 修改密码
   */
  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;
    
    try {
      // 1. 获取当前用户信息
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          passwordHash: true,
        }
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      // 2. 如果已设置密码，需要验证当前密码
      if (user.passwordHash && !currentPassword) {
        throw new BadRequestException('请输入当前密码');
      }
      
      if (user.passwordHash && currentPassword) {
        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
          throw new BadRequestException('当前密码错误');
        }
      }

      // 3. 检查新密码是否与当前密码相同
      if (user.passwordHash && currentPassword === newPassword) {
        throw new BadRequestException('新密码不能与当前密码相同');
      }

      // 4. 加密新密码
      const saltRounds = 12; // 使用更安全的加密轮数
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // 5. 更新密码
      await this.prisma.user.update({
        where: { id: userId },
        data: { 
          passwordHash: hashedPassword,
          updatedAt: new Date()
        }
      });

      console.log(`用户 ${userId} 密码修改成功`);

    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException) {
        throw error;
      }
      console.error('修改密码失败:', error);
      throw new InternalServerErrorException('修改密码失败，请稍后重试');
    }
  }

  /**
   * 完善微信绑定实现
   * 通过微信授权码获取用户信息并绑定到现有账号
   */
  async bindWechatAccount(userId: number, wechatBindDto: WechatBindDto): Promise<WechatBindStatusDto> {
    const { code } = wechatBindDto;
    
    try {
      // 1. 检查用户是否存在
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        throw new NotFoundException('用户不存在');
      }

      // 2. 检查是否已绑定微信
      if (user.wechatOpenid) {
        throw new ConflictException('该账号已绑定微信，请先解绑');
      }

      // 3. 通过授权码获取微信用户信息
      const wechatUserInfo = await this.getWechatUserInfo(code);
      
      // 4. 检查该微信号是否已被其他账号绑定
      const existingWechatUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { wechatOpenid: wechatUserInfo.openid },
            ...(wechatUserInfo.unionid ? [{ wechatUnionid: wechatUserInfo.unionid }] : [])
          ]
        }
      });

      if (existingWechatUser && existingWechatUser.id !== userId) {
        throw new ConflictException('该微信账号已被其他用户绑定');
      }

      // 5. 绑定微信信息到用户账号
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          wechatOpenid: wechatUserInfo.openid,
          wechatUnionid: wechatUserInfo.unionid || null,
          wechatNickname: wechatUserInfo.nickname,
          wechatAvatar: wechatUserInfo.headimgurl,
          wechatBoundAt: new Date(),
          updatedAt: new Date()
        }
      });

      console.log(`用户 ${userId} 微信绑定成功: ${wechatUserInfo.nickname}`);

      return {
        isBound: true,
        wechatNickname: wechatUserInfo.nickname,
        wechatAvatar: wechatUserInfo.headimgurl,
        boundAt: new Date().toISOString()
      };

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ConflictException) {
        throw error;
      }
      console.error('微信绑定失败:', error);
      throw new InternalServerErrorException('微信绑定失败，请稍后重试');
    }
  }

  /**
   * 通过微信授权码获取用户信息
   * 实现完整的微信OAuth2.0流程
   */
  private async getWechatUserInfo(code: string) {
    const appId = this.configService.get('WECHAT_APPID');
    const appSecret = this.configService.get('WECHAT_APPSECRET');
    
    if (!appId || !appSecret) {
      console.warn('微信开放平台配置缺失，使用Mock数据');
      // Mock数据用于开发测试
      return {
        openid: `mock_openid_${Date.now()}`,
        nickname: 'Mock微信用户',
        headimgurl: 'https://thirdwx.qlogo.cn/mmopen/mock_avatar.jpg',
        unionid: `mock_unionid_${Date.now()}`
      };
    }

    try {
      // 第一步：通过code换取access_token
      const tokenResponse = await fetch(
        `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${appId}&secret=${appSecret}&code=${code}&grant_type=authorization_code`
      );
      const tokenData = await tokenResponse.json();
      
      if (tokenData.errcode) {
        throw new BadRequestException(`微信授权失败: ${tokenData.errmsg}`);
      }

      const { access_token, openid } = tokenData;

      // 第二步：通过access_token获取用户信息
      const userResponse = await fetch(
        `https://api.weixin.qq.com/sns/userinfo?access_token=${access_token}&openid=${openid}&lang=zh_CN`
      );
      const userData = await userResponse.json();
      
      if (userData.errcode) {
        throw new BadRequestException(`获取微信用户信息失败: ${userData.errmsg}`);
      }

      return {
        openid: userData.openid,
        nickname: userData.nickname,
        headimgurl: userData.headimgurl,
        unionid: userData.unionid
      };

    } catch (error) {
      console.error('微信API调用失败:', error);
      throw new BadRequestException('微信授权失败，请重试');
    }
  }

  /**
   * 获取微信登录URL（完善实现）
   */
  async getWechatLoginUrl(redirectUrl?: string, ip?: string) {
    const appId = this.configService.get('WECHAT_APPID');
    const configuredRedirectUrl = this.configService.get('WECHAT_REDIRECT_URL');
    
    if (!appId) {
      console.warn('微信开放平台AppID未配置，返回Mock URL');
      return {
        success: true,
        data: {
          loginUrl: 'https://mock-wechat-login.example.com/qrcode',
          state: `mock_state_${Date.now()}`
        }
      };
    }

    // 生成随机state参数防止CSRF攻击
    const state = `${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    // 使用配置的回调URL或传入的URL
    const finalRedirectUrl = redirectUrl || configuredRedirectUrl;
    
    // 构建微信登录URL
    const loginUrl = `https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${encodeURIComponent(finalRedirectUrl)}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;

    return {
      success: true,
      data: {
        loginUrl,
        state
      }
    };
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