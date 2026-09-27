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
  @ApiOperation({
    summary: 'List all providers',
    description: 'Retrieves a list of all configured AI providers.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of AI providers.',
    schema: {
      example: {
        success: true,
        data: [
          {
            id: 'uuid',
            type: 'OPENAI',
            name: 'OpenAI GPT-4',
            isEnabled: true,
            isDefault: true,
            healthStatus: 'HEALTHY',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async listProviders() {
    const data = await this.adminProvidersService.listProviders();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get provider by ID',
    description: 'Retrieves details for a specific AI provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns provider details.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          type: 'OPENAI',
          name: 'OpenAI GPT-4',
          isEnabled: true,
          isDefault: true,
          healthStatus: 'HEALTHY',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async getProvider(@Param('id') id: string) {
    const data = await this.adminProvidersService.getProvider(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({
    summary: 'Create a new provider',
    description:
      'Registers a new AI provider and securely encrypts its API key.',
  })
  @ApiResponse({
    status: 201,
    description: 'Returns created provider.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          type: 'OPENAI',
          name: 'OpenAI GPT-4',
          isEnabled: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async createProvider(@Body() dto: AdminCreateProviderDto) {
    const data = await this.adminProvidersService.createProvider(dto);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a provider',
    description: 'Updates configuration for an existing AI provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated provider.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          type: 'OPENAI',
          name: 'OpenAI Updated',
          isEnabled: true,
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async updateProvider(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProviderDto,
  ) {
    const data = await this.adminProvidersService.updateProvider(id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a provider',
    description: 'Deletes an AI provider. Cannot delete the default provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns success status.',
    schema: {
      example: {
        success: true,
        data: { id: 'uuid', deleted: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @ApiResponse({
    status: 409,
    description: 'Conflict (Cannot delete default provider)',
  })
  async deleteProvider(@Param('id') id: string) {
    const data = await this.adminProvidersService.deleteProvider(id);
    return { success: true, data };
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Enable or disable a provider',
    description: 'Toggles the active status of a provider.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated provider.',
    schema: {
      example: {
        success: true,
        data: { id: 'uuid', isEnabled: false },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateProviderStatusDto,
  ) {
    const data = await this.adminProvidersService.updateProviderStatus(id, dto);
    return { success: true, data };
  }

  @Patch(':id/default')
  @ApiOperation({
    summary: 'Set a provider as default',
    description:
      'Sets the specified provider as the global default and unsets the previous default.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns updated provider.',
    schema: {
      example: {
        success: true,
        data: { id: 'uuid', isDefault: true },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async setDefault(@Param('id') id: string) {
    const data = await this.adminProvidersService.setProviderDefault(id);
    return { success: true, data };
  }

  @Post(':id/health')
  @ApiOperation({
    summary: 'Check provider health',
    description:
      'Pings the provider API to verify availability and updates its health status.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns health check results.',
    schema: {
      example: {
        success: true,
        data: { status: 'HEALTHY', latencyMs: 150 },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  async checkHealth(@Param('id') id: string) {
    const data = await this.adminProvidersService.checkProviderHealth(id);
    return { success: true, data };
  }
}
