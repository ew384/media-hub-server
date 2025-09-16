// src/permissions/permissions.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { CheckPermissionDto, BatchCheckPermissionDto } from './dto/check-permission.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('permissions')
@Controller('permissions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('check/:feature')
  @ApiOperation({ summary: '检查单个功能权限' })
  @ApiResponse({ status: 200, description: '检查完成' })
  async checkPermission(
    @Request() req,
    @Param('feature') feature: string,
  ) {
    const data = await this.permissionsService.checkPermission(req.user.id, feature);
    return {
      code: 200,
      message: '权限检查完成',
      data
    };
  }

  @Post('validate')
  @ApiOperation({ summary: '批量验证权限' })
  @ApiResponse({ status: 200, description: '验证完成' })
  async batchCheckPermissions(
    @Request() req,
    @Body() batchDto: BatchCheckPermissionDto,
  ) {
    const data = await this.permissionsService.batchCheckPermissions(req.user.id, batchDto.features);
    return {
      code: 200,
      message: '批量权限验证完成',
      data
    };
  }

  @Get('list')
  @ApiOperation({ summary: '获取用户所有权限' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserPermissions(@Request() req) {
    const data = await this.permissionsService.getUserPermissions(req.user.id);
    return {
      code: 200,
      message: '获取用户权限成功',
      data
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: '刷新用户权限缓存' })
  @ApiResponse({ status: 200, description: '刷新成功' })
  async refreshPermissions(@Request() req) {
    const data = await this.permissionsService.refreshUserPermissions(req.user.id);
    return {
      code: 200,
      message: '权限缓存已刷新',
      data
    };
  }
}