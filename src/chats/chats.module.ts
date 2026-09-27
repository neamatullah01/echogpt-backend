import { Module } from '@nestjs/common';
import { ChatsController } from './chats.controller.js';
import { ChatsService } from './chats.service.js';
import { PrismaModule } from '../database/prisma.module.js';
import { AiModule } from '../ai/ai.module.js';

@Module({
  imports: [PrismaModule, AiModule],
  controllers: [ChatsController],
  providers: [ChatsService],
})
export class ChatsModule {}
