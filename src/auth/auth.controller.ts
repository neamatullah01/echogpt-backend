import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description: 'Registers a new user in the system and returns authentication tokens.',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    schema: {
      example: {
        success: true,
        data: { accessToken: 'jwt_access_token', refreshToken: 'jwt_refresh_token', user: { id: 'uuid', name: 'John', email: 'john@example.com' } }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation Error / Bad Request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.register(dto, ip, userAgent);
    return { success: true, data: result };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login user',
    description: 'Authenticates a user and returns new access and refresh tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
    schema: {
      example: {
        success: true,
        data: { accessToken: 'jwt_access_token', refreshToken: 'jwt_refresh_token', user: { id: 'uuid', name: 'John', email: 'john@example.com' } }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation Error / Bad Request' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.login(dto, ip, userAgent);
    return { success: true, data: result };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Refreshes an expired access token using a valid refresh token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    schema: {
      example: {
        success: true,
        data: { accessToken: 'new_jwt_access_token', refreshToken: 'new_jwt_refresh_token' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation Error / Bad Request' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const result = await this.authService.refresh(dto, ip, userAgent);
    return { success: true, data: result };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout user session',
    description: 'Revokes the provided refresh token, ending the specific session.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      example: { success: true, data: {} }
    }
  })
  @ApiResponse({ status: 400, description: 'Validation Error / Bad Request' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.authService.logout(dto.refreshToken);
    return { success: true, data: {} };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Logout all sessions',
    description: 'Revokes all active sessions and refresh tokens for the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out of all sessions',
    schema: {
      example: { success: true, data: {} }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async logoutAll(@Req() req: any) {
    const userId = req.user.id;
    await this.authService.logoutAll(userId);
    return { success: true, data: {} };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify email using token',
    description: 'Verifies a user email using a valid verification token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      example: { success: true, data: {} }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid or expired verification token' })
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    await this.authService.verifyEmail(dto);
    return { success: true, data: {} };
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'))
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Resends an email verification link to the authenticated user.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent',
    schema: {
      example: { success: true, data: { message: 'Verification email sent' } }
    }
  })
  @ApiResponse({ status: 400, description: 'Email already verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async resendVerification(@Req() req: any) {
    const userId = req.user.id;
    const result = await this.authService.resendVerification(userId);
    return { success: true, data: result };
  }
}
