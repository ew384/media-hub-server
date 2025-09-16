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

import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';
import { RegisterDto, LoginDto, AuthResponseDto, UserResponseDto } from './dto';

@Injectable()
export class AuthService {
  private readonly saltRounds: number;
  private readonly maxLoginAttempts: number;
  private readonly loginAttemptWindow: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {
    this.saltRounds = this.configService.get('BCRYPT_SALT_ROUNDS', 12);
    this.maxLoginAttempts = this.configService.get('MAX_LOGIN_ATTEMPTS', 5);
    this.loginAttemptWindow = this.configService.get('LOGIN_ATTEMPT_WINDOW', 3600);
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