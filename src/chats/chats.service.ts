import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { AiProviderService } from '../ai/ai-provider.service.js';
import { CreateChatDto } from './dto/create-chat.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';
import { SendMessageDto } from './dto/send-message.dto.js';
import {
  MessageRole,
  SubscriptionStatus,
  UsageOperation,
} from '../generated/prisma/enums.js';

@Injectable()
export class ChatsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProviderService: AiProviderService,
  ) {}

  async createConversation(userId: string, dto: CreateChatDto) {
    return this.prisma.conversation.create({
      data: {
        userId,
        title: dto.title,
      },
    });
  }

  async listConversations(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where: { userId } }),
    ]);

    return { data, total, page, limit };
  }

  async getConversation(userId: string, conversationId: string) {
    const chat = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!chat) throw new NotFoundException('Conversation not found.');
    if (chat.userId !== userId) throw new ForbiddenException('Access denied.');

    return chat;
  }

  async renameConversation(
    userId: string,
    conversationId: string,
    dto: UpdateChatDto,
  ) {
    const chat = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!chat) throw new NotFoundException('Conversation not found.');
    if (chat.userId !== userId) throw new ForbiddenException('Access denied.');

    return this.prisma.conversation.update({
      where: { id: conversationId },
      data: { title: dto.title },
    });
  }

  async deleteConversation(userId: string, conversationId: string) {
    const chat = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!chat) throw new NotFoundException('Conversation not found.');
    if (chat.userId !== userId) throw new ForbiddenException('Access denied.');

    await this.prisma.conversation.delete({ where: { id: conversationId } });
    return { success: true };
  }

  async sendPrompt(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const chat = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!chat) throw new NotFoundException('Conversation not found.');
    if (chat.userId !== userId) throw new ForbiddenException('Access denied.');

    if (!dto.prompt || dto.prompt.trim() === '') {
      throw new BadRequestException('Prompt cannot be empty.');
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub || sub.status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException('Active subscription required.');
    }

    const usage = await this.prisma.userUsageCounter.findUnique({
      where: { userId },
    });
    const chatsUsed = usage?.chatsUsed || 0;
    if (chatsUsed >= sub.plan.monthlyChatLimit) {
      throw new ForbiddenException('Monthly chat limit exceeded.');
    }

    const { adapter, providerDb, rawApiKey } =
      await this.aiProviderService.getProviderAdapter(dto.providerId);

    await this.prisma.userUsageCounter.upsert({
      where: { userId },
      update: { chatsUsed: { increment: 1 } },
      create: {
        userId,
        chatsUsed: 1,
        periodStart: new Date(),
        periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      },
    });

    try {
      const history = await this.prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: 50, // simplistic history limit
      });

      await this.prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.USER,
          content: dto.prompt,
        },
      });

      const aiResponse = await this.aiProviderService.generateResponse(
        dto.prompt,
        providerDb.id,
        dto.model,
        history.map((h) => ({ role: h.role, content: h.content })),
      );

      const assistantMessage = await this.prisma.message.create({
        data: {
          conversationId,
          role: MessageRole.ASSISTANT,
          content: aiResponse.content,
          providerType: providerDb.type,
          model: dto.model || providerDb.defaultModel,
          inputTokens: aiResponse.tokenUsage?.promptTokens || null,
          outputTokens: aiResponse.tokenUsage?.completionTokens || null,
        },
      });

      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          providerId: providerDb.id,
          operation: UsageOperation.CHAT,
          model: dto.model || providerDb.defaultModel,
          inputTokens: aiResponse.tokenUsage?.promptTokens || 0,
          outputTokens: aiResponse.tokenUsage?.completionTokens || 0,
          success: true,
        },
      });

      return {
        message: assistantMessage,
        usage: aiResponse.tokenUsage,
      };
    } catch (error: any) {
      await this.prisma.userUsageCounter.update({
        where: { userId },
        data: { chatsUsed: { decrement: 1 } },
      });

      await this.prisma.apiUsageLog.create({
        data: {
          userId,
          providerId: providerDb.id,
          operation: UsageOperation.CHAT,
          model: dto.model || providerDb.defaultModel,
          success: false,
          errorMessage: error.message,
        },
      });

      if (error instanceof InternalServerErrorException) {
        throw error;
      }

      throw new InternalServerErrorException({
        success: false,
        error: {
          code: 'AI_PROVIDER_ERROR',
          message:
            'An error occurred while communicating with the AI provider.',
        },
      });
    }
  }

  async sendPromptStream(
    userId: string,
    conversationId: string,
    dto: SendMessageDto,
  ) {
    const chat = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!chat) throw new NotFoundException('Conversation not found.');
    if (chat.userId !== userId) throw new ForbiddenException('Access denied.');

    if (!dto.prompt || dto.prompt.trim() === '') {
      throw new BadRequestException('Prompt cannot be empty.');
    }

    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });
    if (!sub || sub.status !== SubscriptionStatus.ACTIVE) {
      throw new ForbiddenException('Active subscription required.');
    }

    const usage = await this.prisma.userUsageCounter.findUnique({
      where: { userId },
    });
    const chatsUsed = usage?.chatsUsed || 0;
    if (chatsUsed >= sub.plan.monthlyChatLimit) {
      throw new ForbiddenException('Monthly chat limit exceeded.');
    }

    const { providerDb } = await this.aiProviderService.getProviderAdapter(
      dto.providerId,
    );

    await this.prisma.userUsageCounter.upsert({
      where: { userId },
      update: { chatsUsed: { increment: 1 } },
      create: {
        userId,
        chatsUsed: 1,
        periodStart: new Date(),
        periodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      },
    });

    const history = await this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });

    await this.prisma.message.create({
      data: {
        conversationId,
        role: MessageRole.USER,
        content: dto.prompt,
      },
    });

    const stream = this.aiProviderService.generateStream(
      dto.prompt,
      providerDb.id,
      dto.model,
      history.map((h) => ({ role: h.role, content: h.content })),
    );

    return { stream, providerDb };
  }
}
