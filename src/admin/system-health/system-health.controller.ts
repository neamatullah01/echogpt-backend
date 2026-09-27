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
  @ApiOperation({
    summary: 'Get detailed system health',
    description:
      'Returns health status for the database, AI providers, and overall system.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns system health status.',
    schema: {
      example: {
        success: true,
        data: {
          status: 'healthy',
          components: {
            database: 'healthy',
            redis: 'healthy',
            aiProviders: 'healthy',
          },
          timestamp: '2026-09-25T04:20:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  async getHealth() {
    const data = await this.healthService.getSystemHealth();
    return { success: true, data };
  }
}
