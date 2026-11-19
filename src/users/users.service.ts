import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User, UserRole } from './schemas/user.schema';

import { CreateClientDto } from './dto/create-client.dto';

import { EmailService } from './email.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    private readonly emailService: EmailService,
  ) {}

  // CREATE CLIENT

  async createClient(createClientDto: CreateClientDto) {
    const { fullName, email, password } = createClientDto;

    const normalizedEmail = email.trim().toLowerCase();

    // CHECK EXISTING EMAIL

    const existingUser = await this.userModel
      .findOne({
        email: normalizedEmail,
      })
      .exec();

    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    // HASH PASSWORD

    const hashedPassword = await bcrypt.hash(password, 10);

    // CREATE EMAIL VERIFICATION TOKEN

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Token valid for 24 hours.

    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // CREATE USER

    const user = new this.userModel({
      fullName: fullName.trim(),

      email: normalizedEmail,

      password: hashedPassword,

      // Every normal registration starts as CLIENT.
      role: UserRole.CLIENT,

      isActive: true,

      isEmailVerified: false,

      emailVerificationTokenHash: verificationTokenHash,

      emailVerificationExpiresAt: verificationExpiresAt,
    });

    await user.save();

    // SEND VERIFICATION EMAIL

    try {
      await this.emailService.sendVerificationEmail(
        normalizedEmail,
        fullName,
        verificationToken,
      );
    } catch (error) {
      // If email sending fails, remove the newly created user.
      await this.userModel.findByIdAndDelete(user._id).exec();

      throw error;
    }

    // RESPONSE

    return {
      message:
        'Registration successful. Please check your email and verify your account before logging in.',

      user: {
        id: user._id,

        fullName: user.fullName,

        email: user.email,

        role: user.role,

        isActive: user.isActive,

        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  // FIND USER BY EMAIL

  async findByEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    return this.userModel
      .findOne({
        email: normalizedEmail,
      })
      .select('+password')
      .exec();
  }

  // VERIFY EMAIL

  async verifyEmail(token: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userModel
      .findOne({
        emailVerificationTokenHash: tokenHash,
      })
      .select('+emailVerificationTokenHash')
      .exec();

    if (!user) {
      throw new UnauthorizedException(
        'Invalid or expired email verification token.',
      );
    }

    // CHECK TOKEN EXPIRATION

    if (
      !user.emailVerificationExpiresAt ||
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Email verification token has expired.');
    }

    // VERIFY EMAIL

    user.isEmailVerified = true;

    // Token is single-use.
    user.emailVerificationTokenHash = undefined;

    user.emailVerificationExpiresAt = undefined;

    await user.save();

    return {
      message: 'Email verified successfully. You can now log in.',
    };
  }

  // RESEND VERIFICATION EMAIL

  async resendVerificationEmail(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userModel
      .findOne({
        email: normalizedEmail,
      })
      .exec();

    if (!user) {
      throw new NotFoundException('Account not found.');
    }

    // ALREADY VERIFIED

    if (user.isEmailVerified) {
      return {
        message: 'This email address is already verified.',
      };
    }

    // GENERATE NEW TOKEN

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.emailVerificationTokenHash = verificationTokenHash;

    user.emailVerificationExpiresAt = verificationExpiresAt;

    await user.save();

    // SEND EMAIL

    await this.emailService.sendVerificationEmail(
      normalizedEmail,
      user.fullName || 'User',
      verificationToken,
    );

    return {
      message: 'A new verification email has been sent.',
    };
  }

  // PROMOTE CLIENT TO ADMIN

  async promoteToAdmin(id: string) {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    // ONLY CLIENTS CAN BE PROMOTED

    if (user.role === UserRole.ADMIN) {
      throw new ConflictException('This user is already an administrator.');
    }

    // EMAIL MUST BE VERIFIED

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'The user must verify their email before becoming an administrator.',
      );
    }

    // USER MUST BE ACTIVE

    if (!user.isActive) {
      throw new UnauthorizedException(
        'An inactive user cannot be promoted to administrator.',
      );
    }
    // PROMOTE to Admin

    user.role = UserRole.ADMIN;

    await user.save();

    return {
      message: 'User promoted to administrator successfully.',

      user: {
        id: user._id,

        fullName: user.fullName,

        email: user.email,

        role: user.role,

        isActive: user.isActive,

        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  // CHANGE PASSWORD

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ) {
    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();

    if (!user) {
      throw new NotFoundException('User account not found.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is inactive.');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address first.',
      );
    }

    if (newPassword !== confirmPassword) {
      throw new ConflictException(
        'New password and confirmation password do not match.',
      );
    }

    // CHECK CURRENT PASSWORD

    const passwordMatches = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }

    // PREVENT SAME PASSWORD

    const newPasswordMatchesOld = await bcrypt.compare(
      newPassword,
      user.password,
    );

    if (newPasswordMatchesOld) {
      throw new ConflictException(
        'New password must be different from your current password.',
      );
    }

    // HASH NEW PASSWORD

    user.password = await bcrypt.hash(newPassword, 10);

    await user.save();

    return {
      message: 'Password changed successfully.',
    };
  }

  // REQUEST PASSWORD RESET

  async requestPasswordReset(email: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userModel
      .findOne({
        email: normalizedEmail,
      })
      .exec();

    // Do not reveal whether an account exists.

    if (!user) {
      return {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    }

    if (!user.isEmailVerified) {
      return {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    }

    if (!user.isActive) {
      return {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // GENERATE RESET TOKEN

    const resetToken = crypto.randomBytes(32).toString('hex');

    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Token valid for one hour.

    const resetExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    user.passwordResetTokenHash = resetTokenHash;

    user.passwordResetExpiresAt = resetExpiresAt;

    await user.save();

    await this.emailService.sendPasswordResetEmail(
      normalizedEmail,
      user.fullName || 'User',
      resetToken,
    );

    return {
      message:
        'If an account exists with this email, a password reset link has been sent.',
    };
  }

  // RESET PASSWORD

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const user = await this.userModel
      .findOne({
        passwordResetTokenHash: tokenHash,
      })
      .select('+passwordResetTokenHash +password')
      .exec();

    if (!user) {
      throw new UnauthorizedException(
        'Invalid or expired password reset token.',
      );
    }

    // CHECK EXPIRATION

    if (
      !user.passwordResetExpiresAt ||
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Password reset token has expired.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Your account is inactive.');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException(
        'Please verify your email address first.',
      );
    }

    // PREVENT SAME PASSWORD

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      throw new ConflictException(
        'New password must be different from your current password.',
      );
    }

    // UPDATE PASSWORD

    user.password = await bcrypt.hash(newPassword, 10);

    // Reset token is single-use.

    user.passwordResetTokenHash = undefined;

    user.passwordResetExpiresAt = undefined;

    await user.save();

    return {
      message:
        'Password reset successfully. You can now log in with your new password.',
    };
  }

  // FIND USER BY ID

  async findById(id: string) {
    return this.userModel.findById(id).select('-password').exec();
  }

  // FIND CLIENTS

  async findClients() {
    return this.userModel
      .find({
        role: UserRole.CLIENT,
      })
      .select('-password')
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  // FIND ADMINS

  async findAdmins() {
    return this.userModel
      .find({
        role: UserRole.ADMIN,
      })
      .select('-password')
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  // FIND ALL USERS

  async findAll() {
    return this.userModel
      .find()
      .select('-password')
      .sort({
        createdAt: -1,
      })
      .exec();
  }

  // DELETE USER

  async deleteUser(id: string) {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role !== UserRole.CLIENT) {
      throw new ConflictException(
        'Administrators cannot delete another administrator.',
      );
    }

    await this.userModel.findByIdAndDelete(id).exec();

    return {
      message: 'User account deleted successfully.',

      user: {
        id: user._id,

        fullName: user.fullName,

        email: user.email,

        role: user.role,
      },
    };
  }

  // ACTIVATE / DEACTIVATE USER

  async updateActiveStatus(id: string, isActive: boolean) {
    const user = await this.userModel.findById(id).exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    user.isActive = isActive;

    await user.save();

    return {
      message: 'User active status updated successfully.',

      user: {
        id: user._id,

        fullName: user.fullName,

        email: user.email,

        role: user.role,

        isActive: user.isActive,

        isEmailVerified: user.isEmailVerified,
      },
    };
  }
}
