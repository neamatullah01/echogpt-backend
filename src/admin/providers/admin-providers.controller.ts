import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
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
import { AdminProvidersService } from './admin-providers.service.js';
import {
  AdminCreateProviderDto,
  AdminUpdateProviderDto,
  AdminUpdateProviderStatusDto,
} from '../dto/admin-providers.dto.js';

@ApiTags('Admin Providers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin/providers')
export class AdminProvidersController {
  constructor(private readonly adminProvidersService: AdminProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List all providers' })
  @ApiResponse({ status: 200, description: 'Returns a list of AI providers.' })
  async listProviders() {
    const data = await this.adminProvidersService.listProviders();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get provider by ID' })
  @ApiResponse({ status: 200, description: 'Returns provider details.' })
  async getProvider(@Param('id') id: string) {
    const data = await this.adminProvidersService.getProvider(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new provider' })
  @ApiResponse({ status: 201, description: 'Returns created provider.' })
  async createProvider(@Body() dto: AdminCreateProviderDto) {
    const data = await this.adminProvidersService.createProvider(dto);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a provider' })
  @ApiResponse({ status: 200, description: 'Returns updated provider.' })
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProviderDto,
  ) {
    const data = await this.adminProvidersService.updateProvider(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a provider' })
  @ApiResponse({ status: 200, description: 'Returns success status.' })
  async deleteProvider(@Param('id') id: string) {
    const data = await this.adminProvidersService.deleteProvider(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Enable or disable a provider' })
  @ApiResponse({ status: 200, description: 'Returns updated provider.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProviderStatusDto,
  ) {
    const data = await this.adminProvidersService.updateProviderStatus(id, dto);
    return { success: true, data };
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set a provider as default' })
  @ApiResponse({ status: 200, description: 'Returns updated provider.' })
  async setDefault(@Param('id') id: string) {
    const data = await this.adminProvidersService.setProviderDefault(id);
    return { success: true, data };
  }

  @Post(':id/health')
  @ApiOperation({ summary: 'Check provider health' })
  @ApiResponse({ status: 200, description: 'Returns health check results.' })
  async checkHealth(@Param('id') id: string) {
    const data = await this.adminProvidersService.checkProviderHealth(id);
    return { success: true, data };
  }
}
