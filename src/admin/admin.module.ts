import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard/dashboard.controller.js';
import { DashboardService } from './dashboard/dashboard.service.js';
import { AdminUsersController } from './users/admin-users.controller.js';
import { AdminUsersService } from './users/admin-users.service.js';
import { AdminSubscriptionsController } from './subscriptions/admin-subscriptions.controller.js';
import { AdminSubscriptionsService } from './subscriptions/admin-subscriptions.service.js';
import { AdminProvidersController } from './providers/admin-providers.controller.js';
import { AdminProvidersService } from './providers/admin-providers.service.js';
import { AdminAnalyticsController } from './analytics/admin-analytics.controller.js';
import { AdminAnalyticsService } from './analytics/admin-analytics.service.js';
import { AdminSystemHealthController } from './system-health/system-health.controller.js';
import { AdminSystemHealthService } from './system-health/system-health.service.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
  imports: [ProvidersModule],
  controllers: [
    DashboardController,
    AdminUsersController,
    AdminSubscriptionsController,
    AdminProvidersController,
    AdminAnalyticsController,
    AdminSystemHealthController
  ],
  providers: [
    DashboardService,
    AdminUsersService,
    AdminSubscriptionsService,
    AdminProvidersService,
    AdminAnalyticsService,
    AdminSystemHealthService
  ]
})
export class AdminModule {}
