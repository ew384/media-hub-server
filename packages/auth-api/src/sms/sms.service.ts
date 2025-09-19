import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import Dysmsapi, * as $Dysmsapi from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly client: Dysmsapi | null;
  private readonly signName: string;
  private readonly templateCode: string;
  private readonly codeExpireTime: number;
  private readonly dailyLimit: number;
  private readonly rateLimitPerMinute: number;
  private readonly isMockMode: boolean;
  private readonly smsProvider: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {
    // 检查是否为Mock模式
    this.smsProvider = this.configService.get('SMS_PROVIDER', 'aliyun');
    this.isMockMode = this.smsProvider === 'mock' || 
                      this.configService.get('MOCK_EXTERNAL_SERVICES') === 'true';

    console.log(`📱 SMS服务模式: ${this.isMockMode ? 'Mock模式' : '阿里云模式'}`);

    // 只在非Mock模式下初始化阿里云客户端
    if (!this.isMockMode) {
      const accessKeyId = this.configService.get('ALIYUN_ACCESS_KEY_ID');
      const accessKeySecret = this.configService.get('ALIYUN_ACCESS_KEY_SECRET');
      
      if (!accessKeyId || !accessKeySecret) {
        console.warn('⚠️  阿里云SMS配置不完整，将使用Mock模式');
        this.isMockMode = true;
        this.client = null;
      } else {
        const config = new $OpenApi.Config({
          accessKeyId,
          accessKeySecret,
          endpoint: 'dysmsapi.aliyuncs.com',
        });
        this.client = new Dysmsapi(config);
      }
    } else {
      this.client = null;
    }

    this.signName = this.configService.get('ALIYUN_SMS_SIGN_NAME', 'Mock签名');
    this.templateCode = this.configService.get('ALIYUN_SMS_TEMPLATE_CODE', 'SMS_000000');
    this.codeExpireTime = this.configService.get('SMS_CODE_EXPIRE_TIME', 300);
    this.dailyLimit = this.configService.get('SMS_DAILY_LIMIT', 10);
    this.rateLimitPerMinute = this.configService.get('SMS_RATE_LIMIT_PER_MINUTE', 3);
  }

  /**
   * 发送短信验证码
   */
  async sendCode(
    phone: string,
    scene: 'register' | 'login' | 'reset_password',
    ip: string,
  ): Promise<{ expireTime: number }> {
    // 检查发送频率限制
    await this.checkRateLimit(phone, ip);

    // 检查每日发送限制
    await this.checkDailyLimit(phone);

    // 生成6位验证码
    const code = this.generateCode();

    try {
      // 发送短信（Mock或真实）
      await this.sendSms(phone, code);

      // 保存验证码到数据库
      const expiresAt = new Date(Date.now() + this.codeExpireTime * 1000);
      await this.prisma.smsCode.create({
        data: {
          phone,
          code,
          scene,
          expiresAt,
        },
      });

      // 更新缓存计数
      await this.updateSendCount(phone, ip);

      return { expireTime: this.codeExpireTime };
    } catch (error) {
      console.error('发送短信失败:', error);
      throw new InternalServerErrorException('短信发送失败，请稍后重试');
    }
  }

  /**
   * 验证短信验证码
   */
  async verifyCode(
    phone: string,
    code: string,
    scene: 'register' | 'login' | 'reset_password',
  ): Promise<boolean> {
    // Mock模式下的特殊验证码
    if (this.isMockMode && code === '123456') {
      console.log(`🧪 Mock模式: 验证码验证通过 - ${phone}`);
      return true;
    }

    const smsCode = await this.prisma.smsCode.findFirst({
      where: {
        phone,
        code,
        scene,
        used: false,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!smsCode) {
      return false;
    }

    // 标记验证码已使用
    await this.prisma.smsCode.update({
      where: { id: smsCode.id },
      data: { used: true },
    });

    return true;
  }

  /**
   * 检查发送频率限制
   */
  private async checkRateLimit(phone: string, ip: string): Promise<void> {
    const phoneKey = `sms:rate:phone:${phone}`;
    const ipKey = `sms:rate:ip:${ip}`;

    const phoneCount = await this.cacheManager.get<number>(phoneKey) || 0;
    const ipCount = await this.cacheManager.get<number>(ipKey) || 0;

    if (phoneCount >= this.rateLimitPerMinute || ipCount >= this.rateLimitPerMinute) {
      throw new HttpException('发送过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * 检查每日发送限制
   */
  private async checkDailyLimit(phone: string): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const count = await this.prisma.smsCode.count({
      where: {
        phone,
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (count >= this.dailyLimit) {
      throw new HttpException('今日发送次数已达上限', HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  /**
   * 更新发送计数缓存
   */
  private async updateSendCount(phone: string, ip: string): Promise<void> {
    const phoneKey = `sms:rate:phone:${phone}`;
    const ipKey = `sms:rate:ip:${ip}`;
    const ttl = 60; // 1分钟

    const phoneCount = await this.cacheManager.get<number>(phoneKey) || 0;
    const ipCount = await this.cacheManager.get<number>(ipKey) || 0;

    await this.cacheManager.set(phoneKey, phoneCount + 1, ttl * 1000);
    await this.cacheManager.set(ipKey, ipCount + 1, ttl * 1000);
  }

  /**
   * 生成6位验证码
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 发送短信到阿里云或Mock
   */
  private async sendSms(phone: string, code: string): Promise<void> {
    if (this.isMockMode) {
      // Mock模式 - 模拟发送
      console.log(`🧪 Mock模式: 发送短信到 ${phone}, 验证码: ${code}`);
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 模拟偶尔的发送失败（用于测试错误处理）
      if (Math.random() < 0.05) { // 5% 失败率
        throw new Error('Mock模式: 模拟短信发送失败');
      }
      
      return;
    }

    // 真实阿里云模式
    if (!this.client) {
      throw new Error('阿里云SMS客户端未初始化');
    }

    const sendSmsRequest = new $Dysmsapi.SendSmsRequest({
      phoneNumbers: phone,
      signName: this.signName,
      templateCode: this.templateCode,
      templateParam: JSON.stringify({ code }),
    });

    try {
      const response = await this.client.sendSms(sendSmsRequest);

      if (response.body.code !== 'OK') {
        throw new Error(`阿里云短信发送失败: ${response.body.message}`);
      }

      console.log(`📱 短信发送成功: ${phone}, 验证码: ${code}`);
    } catch (error) {
      console.error('阿里云短信API调用失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期验证码
   */
  async cleanupExpiredCodes(): Promise<void> {
    await this.prisma.smsCode.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * 获取Mock模式验证码（仅用于开发测试）
   */
  getMockVerificationCode(): string {
    if (!this.isMockMode) {
      throw new Error('仅在Mock模式下可用');
    }
    return '123456';
  }
}