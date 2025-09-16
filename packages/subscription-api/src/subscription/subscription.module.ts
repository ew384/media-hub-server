// src/subscription/subscription.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from './subscription.service';
import { Subscription } from './entities/subscription.entity';
import { SubscriptionFeature } from './entities/subscription-feature.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, SubscriptionFeature])
  ],
  controllers: [SubscriptionController],
  providers: [SubscriptionService],
  exports: [SubscriptionService]
})
export class SubscriptionModule {}