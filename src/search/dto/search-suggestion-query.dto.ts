import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SearchSuggestionQueryDto {
  @ApiProperty({
    description: 'The partial query string to get suggestions for',
    example: 'nest',
  })
  @IsString()
  @IsNotEmpty()
  q: string;
}
