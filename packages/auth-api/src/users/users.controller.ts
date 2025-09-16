import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto } from '../auth/dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('用户')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取用户资料' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.findById(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新用户资料' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }
  
  // 用户相关的其他接口可以在这里添加
  // 如：获取用户列表、管理员功能等
}
