import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsEnum, IsObject } from 'class-validator';
import { AiProviderType } from '../../generated/prisma/enums.js';

export class CreateProviderDto {
  @ApiProperty({ enum: AiProviderType, description: 'Type of AI Provider' })
  @IsEnum(AiProviderType)
  @IsNotEmpty()
  provider: AiProviderType;

  @ApiProperty({ description: 'Display name for the provider', example: 'OpenAI Primary' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Raw API key (will be encrypted)' })
  @IsString()
  @IsNotEmpty()
  apiKey: string;

  @ApiPropertyOptional({ description: 'Default model to use', example: 'gpt-4o' })
  @IsString()
  @IsOptional()
  defaultModel?: string;

  @ApiPropertyOptional({ description: 'Whether the provider is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Additional configuration in JSON format' })
  @IsObject()
  @IsOptional()
  config?: any;
}
