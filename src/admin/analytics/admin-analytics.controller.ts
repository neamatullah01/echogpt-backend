import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { AdminAnalyticsService } from './admin-analytics.service.js';
import {
  AdminUsageSummaryQueryDto,
  AdminRequestLogsQueryDto,
} from '../dto/admin-analytics.dto.js';

@ApiTags('Admin Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin')
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('analytics/usage')
  @ApiOperation({ summary: 'Get usage summary' })
  @ApiResponse({
    status: 200,
    description: 'Returns API usage summary metrics.',
  })
  async getUsageSummary(@Query() query: AdminUsageSummaryQueryDto) {
    const data = await this.adminAnalyticsService.getUsageSummary(query);
    return { success: true, data };
  }

  @Get('analytics/providers')
  @ApiOperation({ summary: 'Get usage by provider' })
  @ApiResponse({
    status: 200,
    description: 'Returns usage aggregated by provider.',
  })
  async getUsageByProvider(@Query() query: AdminUsageSummaryQueryDto) {
    const data = await this.adminAnalyticsService.getUsageByProvider(query);
    return { success: true, data };
  }

  @Get('analytics/daily')
  @ApiOperation({ summary: 'Get daily usage stats' })
  @ApiResponse({ status: 200, description: 'Returns daily usage stats.' })
  async getUsageByDay(@Query() query: AdminUsageSummaryQueryDto) {
    const data = await this.adminAnalyticsService.getUsageByDay(query);
    return { success: true, data };
  }

  @Get('logs/requests')
  @ApiOperation({ summary: 'Get request logs' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of request logs.',
  })
  async getRequestLogs(@Query() query: AdminRequestLogsQueryDto) {
    const { data, meta } =
      await this.adminAnalyticsService.getRequestLogs(query);
    return { success: true, data, meta };
  }
}
