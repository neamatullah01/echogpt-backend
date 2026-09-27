import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service.js';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('subscriptions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current subscription details', description: 'Retrieves details about the user\'s active subscription.' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current subscription plan, status, and usage.',
    schema: {
      example: { success: true, data: { id: 'uuid', status: 'ACTIVE', plan: { name: 'FREE', maxChatRequests: 10, maxSearchRequests: 5 } } }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  async getCurrentSubscription(@CurrentUser() user: any) {
    const data = await this.subscriptionsService.getCurrentSubscription(
      user.id,
    );
    return { success: true, data };
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upgrade subscription plan', description: 'Upgrades the user\'s subscription to a higher tier.' })
  @ApiResponse({
    status: 200,
    description: 'Upgrades the subscription to the specified plan.',
    schema: {
      example: { success: true, data: { id: 'uuid', status: 'ACTIVE', plan: { name: 'PREMIUM' } } }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid subscription plan or already on this plan.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  async upgradeSubscription(
    @CurrentUser() user: any,
    @Body() dto: UpgradeSubscriptionDto,
  ) {
    const data = await this.subscriptionsService.upgradeSubscription(
      user.id,
      dto,
    );
    return { success: true, data };
  }

  @Post('downgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Downgrade subscription plan to Free', description: 'Downgrades the current subscription back to the default free tier.' })
  @ApiResponse({
    status: 200,
    description: 'Downgrades the subscription to the Free plan.',
    schema: {
      example: { success: true, data: { id: 'uuid', status: 'ACTIVE', plan: { name: 'FREE' } } }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Already on the Free plan or Free plan not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  async downgradeSubscription(@CurrentUser() user: any) {
    const data = await this.subscriptionsService.downgradeSubscription(user.id);
    return { success: true, data };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get remaining usage requests', description: 'Returns remaining allowances based on the user\'s active subscription.' })
  @ApiResponse({
    status: 200,
    description: 'Returns the remaining chat and search requests.',
    schema: {
      example: { success: true, data: { chatRequestsRemaining: 8, searchRequestsRemaining: 4 } }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized access.' })
  async getUsage(@CurrentUser() user: any) {
    const data = await this.subscriptionsService.getUsage(user.id);
    return { success: true, data };
  }
}
