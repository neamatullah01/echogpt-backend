import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    example: 'Premium',
    description: 'The name of the subscription plan to upgrade to',
  })
  @IsString()
  @IsNotEmpty()
  plan: string;
}
