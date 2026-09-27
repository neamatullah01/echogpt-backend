import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ProviderKeyService } from './crypto/provider-key.service.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto, UpdateProviderStatusDto } from './dto/update-provider.dto.js';
import { ProviderHealthStatus } from '../generated/prisma/enums.js';

@Injectable()
export class ProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: ProviderKeyService
  ) {}

  private maskApiKey(encryptedKey: string): string {
    // In a real system, you might decode to find length, but we just return a placeholder
    return 'sk-****abcd';
  }

  async getProviders() {
    const providers = await this.prisma.aiProvider.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    return providers.map(p => ({
      id: p.id,
      provider: p.type,
      name: p.name,
      maskedApiKey: this.maskApiKey(p.encryptedApiKey),
      defaultModel: p.defaultModel,
      isEnabled: p.isEnabled,
      isDefault: p.isDefault,
      healthStatus: p.healthStatus,
      lastHealthCheck: p.lastHealthCheck
    }));
  }

  async getProvider(id: string) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Provider not found');

    return {
      id: p.id,
      provider: p.type,
      name: p.name,
      maskedApiKey: this.maskApiKey(p.encryptedApiKey),
      defaultModel: p.defaultModel,
      isEnabled: p.isEnabled,
      isDefault: p.isDefault,
      config: p.config,
      healthStatus: p.healthStatus,
      lastHealthCheck: p.lastHealthCheck
    };
  }

  async addProvider(dto: CreateProviderDto) {
    const encryptedKey = this.cryptoService.encrypt(dto.apiKey);
    
    // Check if this is the first provider; if so, make it default
    const count = await this.prisma.aiProvider.count();
    const isDefault = count === 0;

    const provider = await this.prisma.aiProvider.create({
      data: {
        type: dto.provider,
        name: dto.name,
        encryptedApiKey: encryptedKey,
        defaultModel: dto.defaultModel,
        isEnabled: dto.isEnabled ?? true,
        isDefault,
        config: dto.config ? JSON.parse(JSON.stringify(dto.config)) : null,
      }
    });

    return await this.getProvider(provider.id);
  }

  async editProvider(id: string, dto: UpdateProviderDto) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Provider not found');

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.apiKey) data.encryptedApiKey = this.cryptoService.encrypt(dto.apiKey);
    if (dto.defaultModel !== undefined) data.defaultModel = dto.defaultModel;
    if (dto.isEnabled !== undefined) data.isEnabled = dto.isEnabled;
    if (dto.config !== undefined) data.config = dto.config ? JSON.parse(JSON.stringify(dto.config)) : null;

    if (Object.keys(data).length > 0) {
      await this.prisma.aiProvider.update({
        where: { id },
        data
      });
    }

    return await this.getProvider(id);
  }

  async deleteProvider(id: string) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Provider not found');

    if (p.isDefault) {
      throw new BadRequestException('Cannot delete the default provider. Set another provider as default first.');
    }

    // Preserve usage history by relying on Prisma SetNull or just standard relations as per schema
    await this.prisma.aiProvider.delete({ where: { id } });
    return { success: true };
  }

  async updateStatus(id: string, dto: UpdateProviderStatusDto) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Provider not found');

    await this.prisma.aiProvider.update({
      where: { id },
      data: { isEnabled: dto.isEnabled }
    });

    return await this.getProvider(id);
  }

  async setDefaultProvider(id: string) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Provider not found');

    await this.prisma.$transaction(async (tx) => {
      // Unset existing default
      await tx.aiProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      });

      // Set new default
      await tx.aiProvider.update({
        where: { id },
        data: { isDefault: true }
      });
    });

    return await this.getProvider(id);
  }

  async checkHealth(id: string) {
    const p = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('Provider not found');

    // Simulate health check without exposing API key or doing real requests for now
    const start = Date.now();
    // const rawKey = this.cryptoService.decrypt(p.encryptedApiKey);
    // await requestHealth(rawKey)...
    
    // Fake a small delay
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
    const latencyMs = Date.now() - start;

    await this.prisma.aiProvider.update({
      where: { id },
      data: { 
        healthStatus: ProviderHealthStatus.HEALTHY,
        lastHealthCheck: new Date()
      }
    });

    return {
      status: 'HEALTHY',
      latencyMs
    };
  }
}
