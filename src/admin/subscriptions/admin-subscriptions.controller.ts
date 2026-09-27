import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
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
import { AdminSubscriptionsService } from './admin-subscriptions.service.js';
import {
  AdminListSubscriptionsQueryDto,
  AdminUpdateSubscriptionDto,
  AdminActivateSubscriptionDto,
} from '../dto/admin-subscriptions.dto.js';

@ApiTags('Admin Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(
    private readonly adminSubscriptionsService: AdminSubscriptionsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List all subscriptions',
    description: 'Retrieves a paginated list of all user subscriptions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of subscriptions.',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            userId: 'user-uuid',
            status: 'ACTIVE',
            plan: { name: 'PREMIUM' },
          },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listSubscriptions(@Query() query: AdminListSubscriptionsQueryDto) {
    const { data, meta } =
      await this.adminSubscriptionsService.listSubscriptions(query);
    return { success: true, data, meta };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get subscription by ID',
    description: 'Retrieves details for a specific subscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns subscription details.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          userId: 'user-uuid',
          status: 'ACTIVE',
          plan: { name: 'PREMIUM' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async getSubscription(@Param('id') id: string) {
    const data = await this.adminSubscriptionsService.getSubscription(id);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a subscription',
    description: 'Updates the status of a specific subscription.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated subscription.',
    schema: {
      example: {
        success: true,
        data: { id: 'uuid', status: 'CANCELED' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async updateSubscription(
    @Param('id') id: string,
    @Body() dto: AdminUpdateSubscriptionDto,
  ) {
    const data = await this.adminSubscriptionsService.updateSubscription(
      id,
      dto,
    );
    return { success: true, data };
  }

  @Post(':userId/activate')
  @ApiOperation({
    summary: 'Activate a subscription for a user',
    description:
      'Creates or updates a subscription to a specific plan for the given user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns newly activated subscription.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          userId: 'user-uuid',
          status: 'ACTIVE',
          planId: 'plan-uuid',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Plan not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateSubscription(
    @Param('userId') userId: string,
    @Body() dto: AdminActivateSubscriptionDto,
  ) {
    const data = await this.adminSubscriptionsService.activateSubscription(
      userId,
      dto,
    );
    return { success: true, data };
  }

  @Post(':userId/cancel')
  @ApiOperation({
    summary: 'Cancel a subscription for a user',
    description: 'Cancels the active subscription for the given user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns canceled subscription.',
    schema: {
      example: {
        success: true,
        data: { id: 'uuid', userId: 'user-uuid', status: 'CANCELED' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async cancelSubscription(@Param('userId') userId: string) {
    const data =
      await this.adminSubscriptionsService.cancelSubscription(userId);
    return { success: true, data };
  }
}
