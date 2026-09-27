import { Controller, Get, UseGuards } from '@nestjs/common';
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
import { AdminSystemHealthService } from './system-health.service.js';

@ApiTags('Admin System Health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin/system/health')
export class AdminSystemHealthController {
  constructor(private readonly healthService: AdminSystemHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get detailed system health' })
  @ApiResponse({ status: 200, description: 'Returns system health status.' })
  async getHealth() {
    const data = await this.healthService.getSystemHealth();
    return { success: true, data };
  }
}
