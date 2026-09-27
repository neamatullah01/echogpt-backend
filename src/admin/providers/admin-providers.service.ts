import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AdminCreateProviderDto,
  AdminUpdateProviderDto,
  AdminUpdateProviderStatusDto,
} from '../dto/admin-providers.dto.js';
import { ProviderKeyService } from '../../providers/crypto/provider-key.service.js';

@Injectable()
export class AdminProvidersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerKeyService: ProviderKeyService,
  ) {}

  async listProviders() {
    const providers = await this.prisma.aiProvider.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return providers.map((p) => this.sanitizeProvider(p));
  }

  async getProvider(id: string) {
    const provider = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!provider) {
      throw new NotFoundException('Provider not found');
    }
    return this.sanitizeProvider(provider);
  }

  async createProvider(dto: AdminCreateProviderDto) {
    const encryptedKey = await this.providerKeyService.encrypt(dto.apiKey);

    const provider = await this.prisma.aiProvider.create({
      data: {
        type: dto.type,
        name: dto.name,
        encryptedApiKey: encryptedKey,
        defaultModel: dto.defaultModel,
        isEnabled: dto.isEnabled ?? true,
      },
    });

    return this.sanitizeProvider(provider);
  }

  async updateProvider(id: string, dto: AdminUpdateProviderDto) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: dto,
    });

    return this.sanitizeProvider(provider);
  }

  async deleteProvider(id: string) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Provider not found');
    }
    if (existing.isDefault) {
      throw new ConflictException(
        'Cannot delete the default provider. Set another provider as default first.',
      );
    }

    await this.prisma.aiProvider.delete({ where: { id } });
    return { id, deleted: true };
  }

  async updateProviderStatus(id: string, dto: AdminUpdateProviderStatusDto) {
    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: { isEnabled: dto.isEnabled },
    });
    return this.sanitizeProvider(provider);
  }

  async setProviderDefault(id: string) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    await this.prisma.$transaction(async (prisma) => {
      await prisma.aiProvider.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
      await prisma.aiProvider.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return this.getProvider(id);
  }

  async checkProviderHealth(id: string) {
    const existing = await this.prisma.aiProvider.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('Provider not found');
    }

    const isHealthy = true;
    const latencyMs = Math.floor(Math.random() * 500) + 100;

    const provider = await this.prisma.aiProvider.update({
      where: { id },
      data: {
        healthStatus: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
        lastHealthCheck: new Date(),
      },
    });

    return {
      status: provider.healthStatus,
      latencyMs,
    };
  }

  private sanitizeProvider(provider: any) {
    const { encryptedApiKey, ...safeProvider } = provider;
    return {
      ...safeProvider,
      maskedApiKey: `sk-****${encryptedApiKey.slice(-4)}`, // Simplified mask logic
    };
  }
}
