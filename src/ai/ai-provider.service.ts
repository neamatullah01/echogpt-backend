import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ProviderKeyService } from '../providers/crypto/provider-key.service.js';
import { AiProviderAdapter, GenerateResponseInput } from './interfaces/ai-provider.interface.js';
import { OpenAiAdapter } from './adapters/openai.adapter.js';
import { AiProviderType } from '../generated/prisma/enums.js';

@Injectable()
export class AiProviderService {
  private adapters: Map<AiProviderType, AiProviderAdapter> = new Map();

  constructor(
    private prisma: PrismaService,
    private cryptoService: ProviderKeyService
  ) {
    this.adapters.set(AiProviderType.OPENAI, new OpenAiAdapter());
    // this.adapters.set(AiProviderType.ANTHROPIC, new AnthropicAdapter());
    // this.adapters.set(AiProviderType.GOOGLE_GEMINI, new GeminiAdapter());
  }

  async getProviderAdapter(providerId?: string) {
    let providerDb;
    if (providerId) {
      providerDb = await this.prisma.aiProvider.findUnique({ where: { id: providerId } });
    } else {
      providerDb = await this.prisma.aiProvider.findFirst({ where: { isDefault: true, isEnabled: true } });
    }

    if (!providerDb) {
      throw new NotFoundException('AI Provider not found or not available.');
    }
    if (!providerDb.isEnabled) {
      throw new InternalServerErrorException('The selected AI provider is disabled.');
    }

    const adapter = this.adapters.get(providerDb.type as AiProviderType);
    if (!adapter) {
      throw new InternalServerErrorException(`Adapter for provider type ${providerDb.type} is not implemented.`);
    }

    const rawApiKey = this.cryptoService.decrypt(providerDb.encryptedApiKey);

    return {
      adapter,
      providerDb,
      rawApiKey
    };
  }

  async generateResponse(prompt: string, providerId?: string, model?: string, history?: any[]) {
    const { adapter, providerDb, rawApiKey } = await this.getProviderAdapter(providerId);

    const input: GenerateResponseInput = {
      prompt,
      history,
      model: model || providerDb.defaultModel || undefined,
      apiKey: rawApiKey,
      config: providerDb.config
    };

    try {
      return await adapter.generateResponse(input);
    } catch (error) {
      // Return safe error as per PRD edge cases
      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'AI_PROVIDER_UNAVAILABLE',
          message: 'The selected AI provider is temporarily unavailable.'
        }
      });
    }
  }

  async *generateStream(prompt: string, providerId?: string, model?: string, history?: any[]) {
    const { adapter, providerDb, rawApiKey } = await this.getProviderAdapter(providerId);

    if (!adapter.generateStream) {
      throw new InternalServerErrorException('Streaming is not supported by this provider.');
    }

    const input: GenerateResponseInput = {
      prompt,
      history,
      model: model || providerDb.defaultModel || undefined,
      apiKey: rawApiKey,
      config: providerDb.config
    };

    yield* adapter.generateStream(input);
  }
}
