import { Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service.js';
import { PrismaModule } from '../database/prisma.module.js';
import { ProvidersModule } from '../providers/providers.module.js';

@Module({
  imports: [PrismaModule, ProvidersModule],
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiModule {}
