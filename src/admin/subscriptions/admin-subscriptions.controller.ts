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
  @ApiOperation({ summary: 'List all subscriptions' })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of subscriptions.',
  })
  async listSubscriptions(@Query() query: AdminListSubscriptionsQueryDto) {
    const { data, meta } =
      await this.adminSubscriptionsService.listSubscriptions(query);
    return { success: true, data, meta };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ status: 200, description: 'Returns subscription details.' })
  async getSubscription(@Param('id') id: string) {
    const data = await this.adminSubscriptionsService.getSubscription(id);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a subscription' })
  @ApiResponse({ status: 200, description: 'Returns updated subscription.' })
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
  @ApiOperation({ summary: 'Activate a subscription for a user' })
  @ApiResponse({
    status: 201,
    description: 'Returns newly activated subscription.',
  })
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
  @ApiOperation({ summary: 'Cancel a subscription for a user' })
  @ApiResponse({ status: 200, description: 'Returns canceled subscription.' })
  async cancelSubscription(@Param('userId') userId: string) {
    const data =
      await this.adminSubscriptionsService.cancelSubscription(userId);
    return { success: true, data };
  }
}
