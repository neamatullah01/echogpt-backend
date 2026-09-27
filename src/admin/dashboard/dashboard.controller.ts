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
import { DashboardService } from './dashboard.service.js';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get admin dashboard statistics',
    description: 'Retrieves aggregate statistics for users, subscriptions, usage, and providers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns aggregate statistics.',
    schema: {
      example: {
        success: true,
        data: {
          users: { total: 1000, active: 850 },
          subscriptions: { free: 800, premium: 200 },
          usage: { chatRequests: 25000, searchRequests: 8000 },
          providers: { enabled: 3, healthy: 2 }
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (requires ADMIN role)' })
  async getDashboard() {
    const data = await this.dashboardService.getDashboardStats();
    return { success: true, data };
  }
}
