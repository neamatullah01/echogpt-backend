import { ApiPropertyOptional, PartialType, OmitType } from '@nestjs/swagger';
import { CreateProviderDto } from './create-provider.dto.js';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateProviderDto extends PartialType(
  OmitType(CreateProviderDto, ['provider'] as const)
) {}

export class UpdateProviderStatusDto {
  @ApiPropertyOptional({ description: 'Whether the provider is enabled' })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;
}
