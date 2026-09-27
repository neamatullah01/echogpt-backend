import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { RoleName } from '../../generated/prisma/enums.js';
import { AdminUsersService } from './admin-users.service.js';
import {
  AdminListUsersQueryDto,
  AdminUpdateUserRoleDto,
  AdminUpdateUserStatusDto,
} from '../dto/admin-users.dto.js';

@ApiTags('Admin Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly adminUsersService: AdminUsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with pagination, search, and filtering',
    description: 'Retrieves a list of users with their roles and statuses.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of users.',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            name: 'John Doe',
            email: 'john@example.com',
            role: { name: 'USER' },
            status: 'ACTIVE',
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  async listUsers(@Query() query: AdminListUsersQueryDto) {
    const { data, meta } = await this.adminUsersService.listUsers(query);
    return { success: true, data, meta };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single user by ID',
    description:
      'Retrieves user details including subscriptions and usage limits.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user details.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          name: 'John Doe',
          email: 'john@example.com',
          role: { name: 'USER' },
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id') id: string) {
    const data = await this.adminUsersService.getUser(id);
    return { success: true, data };
  }

  @Patch(':id/role')
  @ApiOperation({
    summary: 'Change a user role',
    description: 'Promotes or demotes a user to a specific role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated user.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          name: 'John Doe',
          email: 'john@example.com',
          role: { name: 'ADMIN' },
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Role not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (cannot change own role)',
  })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserRoleDto,
    @Request() req: any,
  ) {
    const data = await this.adminUsersService.updateUserRole(
      id,
      dto,
      req.user.id,
    );
    return { success: true, data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change a user status (suspend, active, deleted)',
    description: 'Changes the active status of a user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated user.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          name: 'John Doe',
          email: 'john@example.com',
          role: { name: 'USER' },
          status: 'SUSPENDED',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden (cannot change own status)',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserStatusDto,
    @Request() req: any,
  ) {
    const data = await this.adminUsersService.updateUserStatus(
      id,
      dto,
      req.user.id,
    );
    return { success: true, data };
  }
}
