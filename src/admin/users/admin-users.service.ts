import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AdminListUsersQueryDto,
  AdminUpdateUserRoleDto,
  AdminUpdateUserStatusDto,
} from '../dto/admin-users.dto.js';
import { RoleName } from '../../generated/prisma/enums.js';

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(query: AdminListUsersQueryDto) {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = { name: role };
    }
    if (status) {
      where.status = status;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const data = users.map((u) => {
      const { passwordHash, ...safeUser } = u;
      return safeUser;
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        subscription: { include: { plan: true } },
        usageCounter: true,
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  async updateUserRole(
    id: string,
    dto: AdminUpdateUserRoleDto,
    currentAdminId: string,
  ) {
    if (id === currentAdminId) {
      throw new ForbiddenException('Cannot change your own role.');
    }

    const newRole = await this.prisma.role.findUnique({
      where: { name: dto.role },
    });
    if (!newRole) {
      throw new BadRequestException('Role not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { roleId: newRole.id },
      include: { role: true },
    });

    const { passwordHash, ...safeUser } = updatedUser;
    return safeUser;
  }

  async updateUserStatus(
    id: string,
    dto: AdminUpdateUserStatusDto,
    currentAdminId: string,
  ) {
    if (id === currentAdminId) {
      throw new ForbiddenException('Cannot change your own status.');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { status: dto.status },
      include: { role: true },
    });

    const { passwordHash, ...safeUser } = updatedUser;
    return safeUser;
  }
}
