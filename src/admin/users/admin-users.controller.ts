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
  })
  @ApiResponse({ status: 200, description: 'Returns a list of users.' })
  async listUsers(@Query() query: AdminListUsersQueryDto) {
    const { data, meta } = await this.adminUsersService.listUsers(query);
    return { success: true, data, meta };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single user by ID' })
  @ApiResponse({ status: 200, description: 'Returns user details.' })
  async getUser(@Param('id') id: string) {
    const data = await this.adminUsersService.getUser(id);
    return { success: true, data };
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Change a user role' })
  @ApiResponse({ status: 200, description: 'Returns updated user.' })
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
  @ApiOperation({ summary: 'Change a user status (suspend, active, deleted)' })
  @ApiResponse({ status: 200, description: 'Returns updated user.' })
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
