import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import {
  SearchHistoryQueryDto,
  RecentSearchesQueryDto,
} from './dto/search-history-query.dto.js';
import { SearchSuggestionQueryDto } from './dto/search-suggestion-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({
    summary: 'Perform a web search',
    description: 'Executes a search query and consumes user usage quota.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns search results.',
    schema: {
      example: {
        success: true,
        data: {
          query: 'NestJS',
          results: [
            {
              title: 'NestJS - A progressive Node.js framework',
              link: 'https://nestjs.com',
              snippet: 'A progressive Node.js framework...',
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 403,
    description: 'Subscription limit exceeded or active subscription required.',
  })
  async search(@Request() req: any, @Body() dto: SearchQueryDto) {
    const data = await this.searchService.performSearch(req.user.id, dto);
    return { success: true, data };
  }

  @Get('history')
  @ApiOperation({
    summary: 'Get paginated search history',
    description: 'Retrieves the search history for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns search history for the authenticated user.',
    schema: {
      example: {
        success: true,
        data: [
          { id: 'uuid', query: 'NestJS', createdAt: '2026-09-25T00:00:00Z' },
        ],
        meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getHistory(@Request() req: any, @Query() query: SearchHistoryQueryDto) {
    const { data, meta } = await this.searchService.getSearchHistory(
      req.user.id,
      query,
    );
    return { success: true, data, meta };
  }

  @Get('recent')
  @ApiOperation({
    summary: 'Get recent unique searches',
    description:
      'Retrieves a list of recent unique search queries for the user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of recent unique queries.',
    schema: {
      example: {
        success: true,
        data: ['NestJS', 'React', 'TypeScript'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getRecent(@Request() req: any, @Query() query: RecentSearchesQueryDto) {
    const data = await this.searchService.getRecentSearches(req.user.id, query);
    return { success: true, data };
  }

  @Get('suggestions')
  @ApiOperation({
    summary: 'Get search suggestions based on past queries',
    description: 'Provides suggestions based on partial query input.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of suggested queries.',
    schema: {
      example: {
        success: true,
        data: ['nestjs tutorial', 'nestjs vs express'],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getSuggestions(
    @Request() req: any,
    @Query() query: SearchSuggestionQueryDto,
  ) {
    const data = await this.searchService.getSearchSuggestions(
      req.user.id,
      query,
    );
    return { success: true, data };
  }
}
