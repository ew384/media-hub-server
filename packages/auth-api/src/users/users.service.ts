import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto, UserResponseDto } from '../auth/dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据ID查找用户
   */
  async findById(id: number): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return this.sanitizeUser(user);
  }

  /**
   * 更新用户资料
   */
  async updateProfile(
    userId: number,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    // 检查用户名是否已被使用
    if (updateProfileDto.username) {
      const existingUser = await this.prisma.user.findFirst({
        where: {
          username: updateProfileDto.username,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        throw new ConflictException('用户名已被使用');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...updateProfileDto,
        updatedAt: new Date(),
      },
    });

    return this.sanitizeUser(user);
  }

  /**
   * 禁用用户
   */
  async disableUser(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 0 },
    });
  }

  /**
   * 启用用户
   */
  async enableUser(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 1 },
    });
  }

  /**
   * 脱敏用户信息
   */
  private sanitizeUser(user: any): UserResponseDto {
    const sanitized: any = {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    // 手机号脱敏
    if (user.phone) {
      sanitized.phone = user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
    }

    // 邮箱脱敏
    if (user.email) {
      const [username, domain] = user.email.split('@');
      const maskedUsername = username.length > 2
        ? username.charAt(0) + '*'.repeat(username.length - 2) + username.slice(-1)
        : username;
      sanitized.email = `${maskedUsername}@${domain}`;
    }

    return sanitized;
  }
}