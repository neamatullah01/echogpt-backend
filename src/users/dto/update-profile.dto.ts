import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'The new name of the user', example: 'Updated Name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
