import {
  Controller,
  Get,
  Patch,
  Delete,
  UseGuards,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile', description: 'Retrieves the profile information of the currently authenticated user.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile retrieved successfully.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized access.' })
  async getProfile(@CurrentUser() user: any) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update user profile', description: 'Updates the profile information of the currently authenticated user.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Profile updated successfully.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized access.' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Patch('me/password')
  @ApiOperation({ summary: 'Change password', description: 'Changes the password for the currently authenticated user and revokes all active sessions.' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Password changed successfully.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid current password.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized access.' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete account', description: 'Soft deletes the current user account and anonymizes personal information.' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Account deleted successfully.' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized access.' })
  async deleteAccount(@CurrentUser() user: any) {
    await this.usersService.deleteAccount(user.id);
  }
}
