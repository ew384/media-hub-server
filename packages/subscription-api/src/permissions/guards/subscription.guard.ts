// src/permissions/guards/subscription.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionService } from '../../subscription/subscription.service';
import { CHECK_SUBSCRIPTION_KEY } from '../decorators/check-subscription.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionService: SubscriptionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const checkSubscription = this.reflector.getAllAndOverride<boolean>(CHECK_SUBSCRIPTION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!checkSubscription) {
      return true; // 不需要检查订阅状态
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    const subscriptionStatus = await this.subscriptionService.getSubscriptionStatus(user.id);

    if (!subscriptionStatus.isActive) {
      throw new ForbiddenException({
        message: '会员已过期，请续费后使用',
        isActive: false,
        suggestedAction: 'renew'
      });
    }

    // 将订阅信息添加到请求对象中，方便后续使用
    request.subscription = subscriptionStatus;

    return true;
  }
}