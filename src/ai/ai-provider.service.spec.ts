import { Test, TestingModule } from '@nestjs/testing';
import { AiProviderService } from './ai-provider.service.js';

describe('AiProviderService', () => {
  let service: AiProviderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiProviderService],
    }).compile();

    service = module.get<AiProviderService>(AiProviderService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
