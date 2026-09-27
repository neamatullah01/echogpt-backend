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
  @ApiOperation({
    summary: 'Get usage summary',
    description:
      'Retrieves aggregated API usage metrics including total requests, successful requests, and tokens used.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns API usage summary metrics.',
    schema: {
      example: {
        success: true,
        data: {
          totalRequests: 1000,
          successfulRequests: 950,
          failedRequests: 50,
          averageLatency: 230,
          totalInputTokens: 50000,
          totalOutputTokens: 25000,
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUsageSummary(@Query() query: AdminUsageSummaryQueryDto) {
    const data = await this.adminAnalyticsService.getUsageSummary(query);
    return { success: true, data };
  }

  @Get('analytics/providers')
  @ApiOperation({
    summary: 'Get usage by provider',
    description: 'Aggregates API usage grouped by AI provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns usage aggregated by provider.',
    schema: {
      example: {
        success: true,
        data: [{ providerId: 'uuid', requestCount: 500, averageLatency: 180 }],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUsageByProvider(@Query() query: AdminUsageSummaryQueryDto) {
    const data = await this.adminAnalyticsService.getUsageByProvider(query);
    return { success: true, data };
  }

  @Get('analytics/daily')
  @ApiOperation({
    summary: 'Get daily usage stats',
    description: 'Retrieves usage statistics aggregated by day.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns daily usage stats.',
    schema: {
      example: {
        success: true,
        data: {
          message: 'Usage by day...',
          mockData: [{ date: '2026-09-25', requests: 120 }],
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getUsageByDay(@Query() query: AdminUsageSummaryQueryDto) {
    const data = await this.adminAnalyticsService.getUsageByDay(query);
    return { success: true, data };
  }

  @Get('logs/requests')
  @ApiOperation({
    summary: 'Get request logs',
    description:
      'Retrieves a paginated list of API request logs without exposing sensitive information.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of request logs.',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            userId: 'user-uuid',
            endpoint: '/api/v1/chats',
            statusCode: 200,
            latencyMs: 250,
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async getRequestLogs(@Query() query: AdminRequestLogsQueryDto) {
    const { data, meta } =
      await this.adminAnalyticsService.getRequestLogs(query);
    return { success: true, data, meta };
  }
}
