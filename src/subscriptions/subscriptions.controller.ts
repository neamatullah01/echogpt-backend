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
  @ApiOperation({ summary: 'Get current subscription details' })
  @ApiResponse({
    status: 200,
    description: 'Returns the current subscription plan, status, and usage.',
  })
  async getCurrentSubscription(@CurrentUser() user: any) {
    const data = await this.subscriptionsService.getCurrentSubscription(
      user.id,
    );
    return { success: true, data };
  }

  @Post('upgrade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Upgrade subscription plan' })
  @ApiResponse({
    status: 200,
    description: 'Upgrades the subscription to the specified plan.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid subscription plan or already on this plan.',
  })
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
  @ApiOperation({ summary: 'Downgrade subscription plan to Free' })
  @ApiResponse({
    status: 200,
    description: 'Downgrades the subscription to the Free plan.',
  })
  @ApiResponse({
    status: 400,
    description: 'Already on the Free plan or Free plan not found.',
  })
  async downgradeSubscription(@CurrentUser() user: any) {
    const data = await this.subscriptionsService.downgradeSubscription(user.id);
    return { success: true, data };
  }

  @Get('usage')
  @ApiOperation({ summary: 'Get remaining usage requests' })
  @ApiResponse({
    status: 200,
    description: 'Returns the remaining chat and search requests.',
  })
  async getUsage(@CurrentUser() user: any) {
    const data = await this.subscriptionsService.getUsage(user.id);
    return { success: true, data };
  }
}
