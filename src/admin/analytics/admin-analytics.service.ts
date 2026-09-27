import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AdminUsageSummaryQueryDto,
  AdminRequestLogsQueryDto,
} from '../dto/admin-analytics.dto.js';
import { UsageOperation } from '../../generated/prisma/enums.js';

@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsageSummary(query: AdminUsageSummaryQueryDto) {
    const where: any = {};
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }
    if (query.providerId) where.providerId = query.providerId;
    if (query.model) where.model = query.model;
    if (query.operation) where.operation = query.operation;
    if (query.userId) where.userId = query.userId;

    const [totalRequests, successfulRequests, failedRequests, tokenUsage] =
      await Promise.all([
        this.prisma.apiUsageLog.count({ where }),
        this.prisma.apiUsageLog.count({ where: { ...where, success: true } }),
        this.prisma.apiUsageLog.count({ where: { ...where, success: false } }),
        this.prisma.apiUsageLog.aggregate({
          where,
          _sum: {
            inputTokens: true,
            outputTokens: true,
            latencyMs: true,
          },
          _avg: {
            latencyMs: true,
          },
        }),
      ]);

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageLatency: tokenUsage._avg.latencyMs || 0,
      totalInputTokens: tokenUsage._sum.inputTokens || 0,
      totalOutputTokens: tokenUsage._sum.outputTokens || 0,
    };
  }

  async getUsageByProvider(query: AdminUsageSummaryQueryDto) {
    const where: any = {};
    if (query.from) where.createdAt = { gte: new Date(query.from) };
    if (query.to)
      where.createdAt = { ...where.createdAt, lte: new Date(query.to) };

    const grouped = await this.prisma.apiUsageLog.groupBy({
      by: ['providerId'],
      where,
      _count: {
        id: true,
      },
      _avg: {
        latencyMs: true,
      },
    });

    return grouped.map((g) => ({
      providerId: g.providerId,
      requestCount: g._count.id,
      averageLatency: g._avg.latencyMs,
    }));
  }

  async getUsageByDay(query: AdminUsageSummaryQueryDto) {
    return {
      message:
        'Usage by day requires specialized SQL or time-series DB in production.',
      mockData: [
        { date: new Date().toISOString().split('T')[0], requests: 120 },
      ],
    };
  }

  async getRequestLogs(query: AdminRequestLogsQueryDto) {
    const {
      page = 1,
      limit = 20,
      method,
      path,
      statusCode,
      userId,
      requestId,
      from,
      to,
    } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.actorUserId = userId; // Assuming audit logs or similar.

    const apiWhere: any = {};
    if (userId) apiWhere.userId = userId;
    if (requestId) apiWhere.requestId = requestId;
    if (statusCode) apiWhere.statusCode = statusCode;
    if (from || to) {
      apiWhere.createdAt = {};
      if (from) apiWhere.createdAt.gte = new Date(from);
      if (to) apiWhere.createdAt.lte = new Date(to);
    }

    const [data, total] = await Promise.all([
      this.prisma.apiUsageLog.findMany({
        where: apiWhere,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiUsageLog.count({ where: apiWhere }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
