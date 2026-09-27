import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service.js';
import { SearchQueryDto } from './dto/search-query.dto.js';
import { SearchHistoryQueryDto, RecentSearchesQueryDto } from './dto/search-history-query.dto.js';
import { SearchSuggestionQueryDto } from './dto/search-suggestion-query.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';

@ApiTags('Search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Post()
  @ApiOperation({ summary: 'Perform a web search' })
  @ApiResponse({ status: 200, description: 'Returns search results.' })
  @ApiResponse({ status: 403, description: 'Subscription limit exceeded or active subscription required.' })
  async search(@Request() req: any, @Body() dto: SearchQueryDto) {
    const data = await this.searchService.performSearch(req.user.id, dto);
    return { success: true, data };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get paginated search history' })
  @ApiResponse({ status: 200, description: 'Returns search history for the authenticated user.' })
  async getHistory(@Request() req: any, @Query() query: SearchHistoryQueryDto) {
    const { data, meta } = await this.searchService.getSearchHistory(req.user.id, query);
    return { success: true, data, meta };
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent unique searches' })
  @ApiResponse({ status: 200, description: 'Returns a list of recent unique queries.' })
  async getRecent(@Request() req: any, @Query() query: RecentSearchesQueryDto) {
    const data = await this.searchService.getRecentSearches(req.user.id, query);
    return { success: true, data };
  }

  @Get('suggestions')
  @ApiOperation({ summary: 'Get search suggestions based on past queries' })
  @ApiResponse({ status: 200, description: 'Returns a list of suggested queries.' })
  async getSuggestions(@Request() req: any, @Query() query: SearchSuggestionQueryDto) {
    const data = await this.searchService.getSearchSuggestions(req.user.id, query);
    return { success: true, data };
  }
}
