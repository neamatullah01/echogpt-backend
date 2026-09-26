import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import crypto from 'crypto';
import { RoleName, SubscriptionStatus } from '../generated/prisma/client.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto, ip?: string, userAgent?: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    
    if (existingUser) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    
    let role = await this.prisma.role.findUnique({ where: { name: RoleName.USER } });
    if (!role) {
      role = await this.prisma.role.create({ data: { name: RoleName.USER } });
    }

    let plan = await this.prisma.subscriptionPlan.findUnique({ where: { name: 'FREE' } });
    if (!plan) {
      plan = await this.prisma.subscriptionPlan.create({
        data: { name: 'FREE', monthlyChatLimit: 100, monthlySearchLimit: 100 },
      });
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email: normalizedEmail,
        passwordHash,
        roleId: role.id,
        subscription: {
          create: {
            planId: plan.id,
            status: SubscriptionStatus.ACTIVE,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          },
        },
      },
      include: { role: true }
    });

    return this.createTokens(user, ip, userAgent);
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail }, include: { role: true } });
    
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createTokens(user, ip, userAgent);
  }

  async refresh(dto: RefreshTokenDto, ip?: string, userAgent?: string) {
    const tokenHash = crypto.createHash('sha256').update(dto.refreshToken).digest('hex');
    const session = await this.prisma.session.findUnique({ where: { refreshTokenHash: tokenHash }, include: { user: { include: { role: true } } } });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      if (session && !session.revokedAt) {
        await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
      }
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.prisma.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
    
    return this.createTokens(session.user, ip, userAgent);
  }

  async logout(userId: string, refreshToken: string) {
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await this.prisma.session.updateMany({
      where: { userId, refreshTokenHash: tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const tokenHash = crypto.createHash('sha256').update(dto.token).digest('hex');
    const verificationToken = await this.prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    
    if (!verificationToken || verificationToken.usedAt || verificationToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: verificationToken.userId }, data: { emailVerified: true } }),
      this.prisma.emailVerificationToken.update({ where: { id: verificationToken.id }, data: { usedAt: new Date() } }),
    ]);
  }

  async resendVerification(userId: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
    
    // In a real scenario, trigger email sending here.
    return { message: 'Verification email sent' };
  }

  private async createTokens(user: any, ip?: string, userAgent?: string) {
    const payload = { sub: user.id, email: user.email, role: user.role?.name || RoleName.USER };
    
    const expiresInConfig = this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') || '15m';
    const accessToken = this.jwtService.sign(payload, { expiresIn: expiresInConfig as any });
    
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const refreshExpiresInDays = parseInt(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')?.replace('d', '') || '30');
    const expiresAt = new Date(Date.now() + refreshExpiresInDays * 24 * 60 * 60 * 1000);

    await this.prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash,
        userAgent,
        ipAddress: ip,
        expiresAt,
      },
    });

    let expiresInSec = 900;
    if (expiresInConfig.endsWith('m')) {
      expiresInSec = parseInt(expiresInConfig.replace('m', '')) * 60;
    }

    return {
      accessToken,
      refreshToken,
      expiresIn: expiresInSec,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role?.name || RoleName.USER,
      },
    };
  }
}
