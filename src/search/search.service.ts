import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import {
  SearchHistoryQueryDto,
  RecentSearchesQueryDto,
} from './dto/search-history-query.dto.js';
import { SearchSuggestionQueryDto } from './dto/search-suggestion-query.dto.js';
import { MockSearchAdapter } from './adapters/mock-search.adapter.js';
import {
  SubscriptionStatus,
  UsageOperation,
} from '../generated/prisma/enums.js';

@Injectable()
export class SearchService {
  private searchAdapter: MockSearchAdapter;

  constructor(private readonly prisma: PrismaService) {
    this.searchAdapter = new MockSearchAdapter();
  }

  async performSearch(userId: string, dto: SearchQueryDto) {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub || sub.status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException('Active subscription required for search.');
    }

    const usage = await this.prisma.userUsageCounter.findUnique({
      where: { userId },
    });
    const searchesUsed = usage?.searchesUsed || 0;
    if (searchesUsed >= sub.plan.monthlySearchLimit) {
      throw new ForbiddenException('Monthly search limit exceeded.');
    }

    await this.prisma.userUsageCounter.upsert({
      where: { userId },
      update: { searchesUsed: { increment: 1 } },
      create: {
        userId,
        searchesUsed: 1,
        periodStart: new Date(),
        periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      },
    });

    try {
      const results = await this.searchAdapter.search(dto.query, dto.limit);

      await this.prisma.webSearch.create({
        data: {
          userId,
          query: dto.query,
          provider: 'MOCK_SEARCH',
          resultCount: results.length,
          cached: false,
        },
      });

      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          operation: UsageOperation.SEARCH,
          success: true,
        },
      });

      return {
        query: dto.query,
        results,
      };
    } catch (error: any) {
      await this.prisma.userUsageCounter.update({
        where: { userId },
        data: { searchesUsed: { decrement: 1 } },
      });

      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          operation: UsageOperation.SEARCH,
          success: false,
          errorMessage: error.message,
        },
      });

      throw error;
    }
  }

  async getSearchHistory(userId: string, query: SearchHistoryQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.webSearch.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.webSearch.count({ where: { userId } }),
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

  async getRecentSearches(userId: string, query: RecentSearchesQueryDto) {
    const limit = query.limit || 10;

    const recent = await this.prisma.webSearch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      distinct: ['query'],
      take: limit,
      select: { query: true, createdAt: true },
    });

    return recent;
  }

  async getSearchSuggestions(userId: string, query: SearchSuggestionQueryDto) {
    const pastSearches = await this.prisma.webSearch.findMany({
      where: {
        userId,
        query: {
          contains: query.q,
          mode: 'insensitive',
        },
      },
      distinct: ['query'],
      take: 5,
      select: { query: true },
    });

    return pastSearches.map((s) => s.query);
  }
}
