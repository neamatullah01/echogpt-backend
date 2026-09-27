import { Module } from '@nestjs/common';
import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';
import { ProviderKeyService } from './crypto/provider-key.service.js';

@Module({
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderKeyService],
  exports: [ProvidersService, ProviderKeyService]
})
export class ProvidersModule {}
