import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateChatDto {
  @ApiProperty({ description: 'Title of the conversation', example: 'Learning NestJS' })
  @IsString()
  @IsNotEmpty()
  title: string;
}
