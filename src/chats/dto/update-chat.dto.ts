import { PartialType } from '@nestjs/swagger';
import { CreateChatDto } from './create-chat.dto.js';

export class UpdateChatDto extends PartialType(CreateChatDto) {}
