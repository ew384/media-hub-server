// src/permissions/guards/permission.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../permissions.service';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermission) {
      return true; // 没有权限要求，直接通过
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    const permissionResult = await this.permissionsService.checkPermission(user.id, requiredPermission);

    if (!permissionResult.hasPermission) {
      throw new ForbiddenException({
        message: permissionResult.reason || '权限不足',
        feature: permissionResult.feature,
        suggestedAction: permissionResult.suggestedAction
      });
    }

    return true;
  }
}