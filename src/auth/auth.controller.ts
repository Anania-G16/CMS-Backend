import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

import { CreateClientDto } from '../users/dto/create-client.dto';
import { ForgotPasswordDto } from '../users/dto/forgot-password.dto';
import { ResetPasswordDto } from '../users/dto/reset-password.dto';
import { ChangePasswordDto } from '../users/dto/change-password.dto';

import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // CLIENT REGISTER

  @Post('register')
  @ApiOperation({
    summary: 'Register a new client',
    description:
      'Registers a client using full name, email, gender, and password. A verification email is sent after successful registration.',
  })
  @ApiResponse({
    status: 201,
    description: 'Client registered successfully. Verification email sent.',
  })
  @ApiResponse({
    status: 409,
    description: 'A client with this email already exists.',
  })
  register(@Body() dto: CreateClientDto) {
    return this.usersService.createClient(dto);
  }

  // CLIENT LOGIN

  @Post('login')
  @ApiOperation({
    summary: ' login',
    description:
      'Users login using their email address and password. The Users email must be verified.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client login successful. JWT access token returned.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials, inactive account, or unverified email.',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  // VERIFY EMAIL

  @Post('verify-email')
  @ApiOperation({
    summary: 'Verify client email',
    description:
      'Verifies a client email address using the verification token received by email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired verification token.',
  })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.usersService.verifyEmail(dto.token);
  }

  // RESEND EMAIL VERIFICATION

  @Post('resend-verification')
  @ApiOperation({
    summary: 'Resend email verification',
    description: 'Sends a new email verification link to an unverified client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Client account not found.',
  })
  resendVerification(@Body('email') email: string) {
    return this.usersService.resendVerificationEmail(email);
  }

  // FORGOT PASSWORD

  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset email to the client. For security, the response does not reveal whether the email exists.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset request processed.',
  })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.usersService.requestPasswordReset(dto.email);
  }

  // RESET PASSWORD

  @Post('reset-password')
  @ApiOperation({
    summary: 'Reset client password',
    description:
      'Resets the client password using the secure token received by email.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired password reset token.',
  })
  @ApiResponse({
    status: 409,
    description: 'New password is the same as the current password.',
  })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(dto.token, dto.newPassword);
  }

  // CHANGE PASSWORD

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Change client password',
    description:
      'Allows an authenticated client to change their password by providing their current password and a new password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully.',
  })
  @ApiResponse({
    status: 401,
    description:
      'Authentication required, current password is incorrect, account is inactive, or email is not verified.',
  })
  @ApiResponse({
    status: 409,
    description: 'New password must be different from the current password.',
  })
  changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(
      req.user.userId,
      dto.currentPassword,
      dto.newPassword,
      dto.confirmPassword,
    );
  }
}
