import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, Min, Max, IsOptional, IsString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { SubscriptionStatus } from '../../generated/prisma/enums.js';

export class AdminListSubscriptionsQueryDto {
  @ApiPropertyOptional({ description: 'Page number', default: 1, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: SubscriptionStatus,
  })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;
}

export class AdminUpdateSubscriptionDto {
  @ApiProperty({
    description: 'New status for the subscription',
    enum: SubscriptionStatus,
  })
  @IsEnum(SubscriptionStatus)
  status: SubscriptionStatus;
}

export class AdminActivateSubscriptionDto {
  @ApiProperty({
    description: 'The Plan Name (e.g. PREMIUM)',
    example: 'PREMIUM',
  })
  @IsString()
  planName: string;
}
