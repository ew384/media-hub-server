// src/permissions/decorators/check-subscription.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CHECK_SUBSCRIPTION_KEY = 'checkSubscription';
export const CheckSubscription = () => SetMetadata(CHECK_SUBSCRIPTION_KEY, true);

