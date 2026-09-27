import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { ProvidersModule } from './providers/providers.module.js';
import { AiModule } from './ai/ai.module.js';
import { ChatsModule } from './chats/chats.module.js';
import { SearchModule } from './search/search.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    SubscriptionsModule,
    ProvidersModule,
    AiModule,
    ChatsModule,
    SearchModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
