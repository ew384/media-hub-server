// src/scheduler/tasks/permission-cache.task.ts
import { Injectable, Logger } from '@nestjs/common';
import { PermissionsService } from '../../permissions/permissions.service';

@Injectable()
export class PermissionCacheTask {
  private readonly logger = new Logger(PermissionCacheTask.name);

  constructor(private permissionsService: PermissionsService) {}

  async execute() {
    this.logger.log('执行权限缓存刷新任务');

    try {
      const refreshedCount = await this.permissionsService.refreshAllPermissionsCache();
      await this.permissionsService.cleanupExpiredPermissions();

      return { refreshedCount };

    } catch (error) {
      this.logger.error('权限缓存刷新任务失败:', error);
      throw error;
    }
  }
}