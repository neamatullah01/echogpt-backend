import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { UserStatus } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { success: true, data: user };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
    return { success: true, data: user };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.passwordHash,
    );
    if (!isValid) {
      throw new BadRequestException('Invalid current password');
    }

    const newPasswordHash = await bcrypt.hash(
      changePasswordDto.newPassword,
      10,
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'CHANGE_PASSWORD',
          entityType: 'User',
          entityId: userId,
        },
      }),
    ]);

    return {
      success: true,
      message: 'Password changed successfully, please re-authenticate',
    };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          status: UserStatus.DELETED,
          name: 'Deleted User',
          email: `deleted_${userId}@example.com`,
          passwordHash: '',
          deletedAt: new Date(),
        },
      }),
      this.prisma.session.deleteMany({
        where: { userId },
      }),
      this.prisma.auditLog.create({
        data: {
          actorUserId: userId,
          action: 'DELETE_ACCOUNT',
          entityType: 'User',
          entityId: userId,
        },
      }),
    ]);
  }
}
