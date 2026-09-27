import { Observable } from 'rxjs';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Sse,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ChatsService } from './chats.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';

@ApiTags('chats')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('chats')
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new conversation',
    description: 'Initializes a new chat conversation for the authenticated user.',
  })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully.',
    schema: {
      example: { success: true, data: { id: 'uuid', title: 'New Chat', createdAt: '2026-09-25T00:00:00Z' } }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createConversation(
    @CurrentUser() user: any,
    @Body() dto: CreateChatDto
  ) {
    const data = await this.chatsService.createConversation(user.id, dto);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({
    summary: 'List conversations',
    description: 'Retrieves a paginated list of all active conversations belonging to the user.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns list of conversations.',
    schema: {
      example: {
        success: true,
        data: [{ id: 'uuid', title: 'How to learn NestJS', createdAt: '2026-09-25T00:00:00Z' }]
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listConversations(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    const data = await this.chatsService.listConversations(user.id, p, l);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a specific conversation',
    description: 'Retrieves a conversation and all of its associated messages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns conversation and messages.',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          title: 'New Chat',
          messages: [{ id: 'msg-uuid', role: 'user', content: 'Hello' }]
        }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    const data = await this.chatsService.getConversation(user.id, id);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rename a conversation',
    description: 'Updates the title of an existing conversation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation renamed.',
    schema: {
      example: { success: true, data: { id: 'uuid', title: 'Updated Title' } }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async renameConversation(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateChatDto
  ) {
    const data = await this.chatsService.renameConversation(user.id, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a conversation',
    description: 'Permanently deletes a conversation and its messages.',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted.',
    schema: {
      example: { success: true, data: { deleted: true } }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async deleteConversation(
    @CurrentUser() user: any,
    @Param('id') id: string
  ) {
    const data = await this.chatsService.deleteConversation(user.id, id);
    return { success: true, data };
  }

  @Post(':id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a prompt to the conversation',
    description: 'Appends a user message to the conversation, invokes the AI provider, and returns the AI response while deducting usage quota.',
  })
  @ApiResponse({
    status: 200,
    description: 'AI Response.',
    schema: {
      example: {
        success: true,
        data: { message: { role: 'assistant', content: 'This is the AI response.' } }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Quota Exceeded' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async sendPrompt(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto
  ) {
    const data = await this.chatsService.sendPrompt(user.id, id, dto);
    return { success: true, data };
  }

  @Post(':id/messages/stream')
  @Sse()
  @ApiOperation({ summary: 'Stream a prompt to the conversation (Bonus)' })
  async streamPrompt(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: SendMessageDto
  ) {
    const { stream } = await this.chatsService.sendPromptStream(user.id, id, dto);
    
    return new Observable((subscriber: any) => {
      (async () => {
        try {
          let fullResponse = '';
          for await (const chunk of stream) {
            fullResponse += chunk;
            subscriber.next({ data: { chunk } });
          }
          // Note: In a complete implementation we would persist fullResponse here to the DB
          subscriber.complete();
        } catch (err) {
          subscriber.error(err);
        }
      })();
    });
  }
}
