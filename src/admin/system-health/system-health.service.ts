import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class AdminSystemHealthService {
  constructor(private readonly prisma: PrismaService) {}

  async getSystemHealth() {
    let dbStatus = 'healthy';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'unhealthy';
    }

    // In a real app, you would also check Redis, queues, etc.
    const redisStatus = 'healthy'; // Placeholder
    
    // Check providers
    const providers = await this.prisma.aiProvider.findMany({
      select: { healthStatus: true }
    });
    
    let aiProvidersStatus = 'healthy';
    const hasUnhealthy = providers.some(p => p.healthStatus === 'UNHEALTHY');
    const hasUnknown = providers.some(p => p.healthStatus === 'UNKNOWN');
    if (hasUnhealthy) {
      aiProvidersStatus = 'degraded';
    } else if (hasUnknown) {
      aiProvidersStatus = 'unknown';
    }

    let overallStatus = 'healthy';
    if (dbStatus === 'unhealthy') {
      overallStatus = 'unhealthy';
    } else if (aiProvidersStatus === 'degraded') {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      components: {
        database: dbStatus,
        redis: redisStatus,
        aiProviders: aiProvidersStatus
      },
      timestamp: new Date()
    };
  }
}
