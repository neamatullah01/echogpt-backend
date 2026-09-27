import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { SubscriptionStatus } from '../../generated/prisma/enums.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats() {
    const [
      totalUsers,
      activeUsers,
      freeSubscriptions,
      premiumSubscriptions,
      usageCounters,
      enabledProviders,
      healthyProviders
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE, plan: { name: 'FREE' } } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE, plan: { name: 'PREMIUM' } } }),
      this.prisma.userUsageCounter.aggregate({
        _sum: {
          chatsUsed: true,
          searchesUsed: true
        }
      }),
      this.prisma.aiProvider.count({ where: { isEnabled: true } }),
      this.prisma.aiProvider.count({ where: { isEnabled: true, healthStatus: 'HEALTHY' } })
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers
      },
      subscriptions: {
        free: freeSubscriptions,
        premium: premiumSubscriptions
      },
      usage: {
        chatRequests: usageCounters._sum.chatsUsed || 0,
        searchRequests: usageCounters._sum.searchesUsed || 0
      },
      providers: {
        enabled: enabledProviders,
        healthy: healthyProviders
      }
    };
  }
}
