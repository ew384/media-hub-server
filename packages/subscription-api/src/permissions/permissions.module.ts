// src/permissions/permissions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { UserPermission } from './entities/user-permission.entity';
import { SubscriptionModule } from '../subscription/subscription.module';
import { PermissionGuard } from './guards/permission.guard';
import { SubscriptionGuard } from './guards/subscription.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserPermission]),
    SubscriptionModule
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService, PermissionGuard, SubscriptionGuard],
  exports: [PermissionsService, PermissionGuard, SubscriptionGuard]
})
export class PermissionsModule {}