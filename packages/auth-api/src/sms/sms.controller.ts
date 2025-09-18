import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ThrottlerGuard } from '@nestjs/throttler';

import { SmsService } from './sms.service';
import { GetClientIp } from '../common/decorators/get-client-ip.decorator';
import { SendSmsDto, VerifySmsDto, SmsResponseDto } from './dto';
import { Throttle } from '@nestjs/throttler';
@ApiTags('短信')
@Controller('sms')
@UseGuards(ThrottlerGuard)
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 1, ttl: 60000 } }) // 1分钟最多1次发送
  @ApiOperation({ summary: '发送短信验证码' })
  @ApiResponse({
    status: 200,
    description: '发送成功',
    type: SmsResponseDto,
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  @ApiResponse({ status: 429, description: '发送过于频繁或达到每日上限' })
  @ApiResponse({ status: 500, description: '短信发送失败' })
  async sendCode(
    @Body() sendSmsDto: SendSmsDto,
    @GetClientIp() ip: string,
  ): Promise<SmsResponseDto> {
    return this.smsService.sendCode(sendSmsDto.phone, sendSmsDto.scene, ip);
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } }) // 1分钟最多5次验证
  @ApiOperation({ summary: '验证短信验证码' })
  @ApiResponse({
    status: 200,
    description: '验证结果',
    schema: {
      type: 'object',
      properties: {
        valid: { type: 'boolean', description: '验证是否通过' },
      },
    },
  })
  @ApiResponse({ status: 400, description: '参数错误' })
  async verifyCode(@Body() verifySmsDto: VerifySmsDto): Promise<{ valid: boolean }> {
    const valid = await this.smsService.verifyCode(
      verifySmsDto.phone,
      verifySmsDto.code,
      verifySmsDto.scene,
    );
    return { valid };
  }
}