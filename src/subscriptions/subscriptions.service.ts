import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto.js';
import { SubscriptionStatus } from '../generated/prisma/enums.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this user.');
    }

    const usage = await this.prisma.userUsageCounter.findUnique({
      where: { userId },
    });

    return {
      plan: subscription.plan.name.toUpperCase(),
      status: subscription.status,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      usage: {
        chat: usage?.chatsUsed || 0,
        search: usage?.searchesUsed || 0,
      },
      limits: {
        chat: subscription.plan.monthlyChatLimit,
        search: subscription.plan.monthlySearchLimit,
      },
    };
  }

  async upgradeSubscription(userId: string, dto: UpgradeSubscriptionDto) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.plan },
    });

    if (!plan) {
      throw new BadRequestException('Invalid subscription plan.');
    }

    const currentSub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!currentSub) {
      throw new NotFoundException('Subscription not found for this user.');
    }

    if (currentSub.plan.name === dto.plan) {
      throw new BadRequestException('You are already on this plan.');
    }

    const updatedSub = await this.prisma.subscription.update({
      where: { id: currentSub.id },
      data: {
        planId: plan.id,
        updatedAt: new Date(),
      },
    });

    await this.prisma.subscriptionHistory.create({
      data: {
        userId,
        fromPlan: currentSub.plan.name,
        toPlan: plan.name,
        status: SubscriptionStatus.ACTIVE,
        effectiveAt: new Date(),
      },
    });

    return updatedSub;
  }

  async downgradeSubscription(userId: string) {
    const freePlan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: 'Free' },
    });

    if (!freePlan) {
      throw new BadRequestException('Free plan not found.');
    }

    const currentSub = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!currentSub) {
      throw new NotFoundException('Subscription not found for this user.');
    }

    if (currentSub.plan.name === 'Free') {
      throw new BadRequestException('You are already on the Free plan.');
    }

    const updatedSub = await this.prisma.subscription.update({
      where: { id: currentSub.id },
      data: {
        planId: freePlan.id,
        updatedAt: new Date(),
      },
    });

    await this.prisma.subscriptionHistory.create({
      data: {
        userId,
        fromPlan: currentSub.plan.name,
        toPlan: freePlan.name,
        status: SubscriptionStatus.ACTIVE,
        effectiveAt: new Date(),
      },
    });

    return updatedSub;
  }

  async getUsage(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found for this user.');
    }

    const usage = await this.prisma.userUsageCounter.findUnique({
      where: { userId },
    });

    const chatUsed = usage?.chatsUsed || 0;
    const searchUsed = usage?.searchesUsed || 0;
    const chatLimit = subscription.plan.monthlyChatLimit;
    const searchLimit = subscription.plan.monthlySearchLimit;

    return {
      chat: {
        used: chatUsed,
        limit: chatLimit,
        remaining: Math.max(0, chatLimit - chatUsed),
      },
      search: {
        used: searchUsed,
        limit: searchLimit,
        remaining: Math.max(0, searchLimit - searchUsed),
      },
    };
  }
}
