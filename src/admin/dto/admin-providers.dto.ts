import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsEnum } from 'class-validator';
import { AiProviderType } from '../../generated/prisma/enums.js';

export class AdminCreateProviderDto {
  @ApiProperty({ description: 'Provider type', enum: AiProviderType })
  @IsEnum(AiProviderType)
  type: AiProviderType;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Raw API key (will be encrypted)' })
  @IsString()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Default model' })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional({ description: 'Is enabled' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean = true;
}

export class AdminUpdateProviderDto {
  @ApiPropertyOptional({ description: 'Display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Default model' })
  @IsOptional()
  @IsString()
  defaultModel?: string;
}

export class AdminUpdateProviderStatusDto {
  @ApiProperty({ description: 'Enabled status' })
  @IsBoolean()
  isEnabled: boolean;
}
