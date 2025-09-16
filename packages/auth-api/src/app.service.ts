import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getSystemInfo() {
    return {
      name: '自媒体多账号管理系统 - 用户认证服务',
      version: '1.0.0',
      description: '提供用户注册、登录、JWT认证等功能',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}
