// src/admin/guards/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    // 检查用户是否为管理员（假设用户表有 role 字段或 isAdmin 字段）
    if (user.role !== 'admin' && !user.isAdmin) {
      throw new ForbiddenException('需要管理员权限');
    }

    return true;
  }
}