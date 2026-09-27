import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ProvidersService } from './providers.service.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto, UpdateProviderStatusDto } from './dto/update-provider.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { RoleName } from '../generated/prisma/enums.js';

@ApiTags('admin/providers')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('admin/providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Get()
  @ApiOperation({ summary: 'List all providers (Admin)' })
  @ApiResponse({ status: 200, description: 'Returns a list of all providers with masked API keys.' })
  async getProviders() {
    const data = await this.providersService.getProviders();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific provider (Admin)' })
  @ApiResponse({ status: 200, description: 'Returns the provider details with masked API key.' })
  async getProvider(@Param('id') id: string) {
    const data = await this.providersService.getProvider(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Add a new provider (Admin)' })
  @ApiResponse({ status: 201, description: 'Provider created successfully.' })
  async addProvider(@Body() dto: CreateProviderDto) {
    const data = await this.providersService.addProvider(dto);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit an existing provider (Admin)' })
  @ApiResponse({ status: 200, description: 'Provider updated successfully.' })
  async editProvider(
    @Param('id') id: string,
    @Body() dto: UpdateProviderDto
  ) {
    const data = await this.providersService.editProvider(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a provider (Admin)' })
  @ApiResponse({ status: 200, description: 'Provider deleted successfully.' })
  async deleteProvider(@Param('id') id: string) {
    const data = await this.providersService.deleteProvider(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Enable or disable a provider (Admin)' })
  @ApiResponse({ status: 200, description: 'Provider status updated.' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateProviderStatusDto
  ) {
    const data = await this.providersService.updateStatus(id, dto);
    return { success: true, data };
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set provider as default (Admin)' })
  @ApiResponse({ status: 200, description: 'Provider set as default.' })
  async setDefaultProvider(@Param('id') id: string) {
    const data = await this.providersService.setDefaultProvider(id);
    return { success: true, data };
  }

  @Post(':id/health')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Run health check for a provider (Admin)' })
  @ApiResponse({ status: 200, description: 'Health check executed.' })
  async checkHealth(@Param('id') id: string) {
    const data = await this.providersService.checkHealth(id);
    return { success: true, data };
  }
}
