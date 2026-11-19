import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { User, UserRole } from './schemas/user.schema';
import { EmailService } from './email.service';

describe('UsersService', () => {
  let service: UsersService;
  let userModel: any;
  let emailService: any;

  const userId = '507f1f77bcf86cd799439011';

  const createUserMock = (overrides: any = {}) => ({
    _id: userId,
    fullName: 'Abebe Kebede',
    email: 'abebe@example.com',
    password: 'hashed-password',
    role: UserRole.CLIENT,
    isActive: true,
    isEmailVerified: false,
    emailVerificationTokenHash: 'token-hash',
    emailVerificationExpiresAt: new Date(Date.now() + 86400000),
    save: jest.fn().mockResolvedValue(true),
    ...overrides,
  });

  beforeEach(async () => {
    userModel = jest.fn().mockImplementation((data) => createUserMock(data));

    userModel.findOne = jest.fn();
    userModel.findById = jest.fn();
    userModel.findByIdAndDelete = jest.fn();
    userModel.find = jest.fn();

    emailService = {
      sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: EmailService,
          useValue: emailService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // INITIALIZATION

  describe('service initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  // CREATE CLIENT

  describe('createClient', () => {
    const dto = {
      fullName: 'Abebe Kebede',
      email: ' ABEBE@EXAMPLE.COM ',
      password: 'StrongPassword123!',
    };

    it('should create a client successfully', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.createClient(dto);

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'abebe@example.com',
      });

      expect(userModel).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Abebe Kebede',
          email: 'abebe@example.com',
          role: UserRole.CLIENT,
          isActive: true,
          isEmailVerified: false,
        }),
      );

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'abebe@example.com',
        'Abebe Kebede',
        expect.any(String),
      );

      expect(result).toEqual(
        expect.objectContaining({
          message:
            'Registration successful. Please check your email and verify your account before logging in.',
          user: expect.objectContaining({
            id: userId,
            fullName: 'Abebe Kebede',
            email: 'abebe@example.com',
            role: UserRole.CLIENT,
            isActive: true,
            isEmailVerified: false,
          }),
        }),
      );
    });

    it('should throw ConflictException when email already exists', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(
          createUserMock({
            email: 'abebe@example.com',
          }),
        ),
      });

      await expect(service.createClient(dto)).rejects.toThrow(
        ConflictException,
      );

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();
    });

    it('should delete the user when verification email fails', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('Email service failed'),
      );

      userModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(true),
      });

      await expect(service.createClient(dto)).rejects.toThrow(
        'Email service failed',
      );

      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(userId);
    });
  });

  // FIND CLIENT BY EMAIL

  describe('findByEmail', () => {
    it('should return a client by normalized email', async () => {
      const user = createUserMock();

      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.findByEmail(' ABEBE@EXAMPLE.COM ');

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'abebe@example.com',
      });

      expect(result).toBe(user);
    });

    it('should return null when client does not exist', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findByEmail('unknown@example.com');

      expect(result).toBeNull();
    });
  });

  // VERIFY EMAIL

  describe('verifyEmail', () => {
    it('should verify a valid email verification token', async () => {
      const user = createUserMock({
        isEmailVerified: false,
        emailVerificationExpiresAt: new Date(Date.now() + 86400000),
      });

      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.verifyEmail('verification-token');

      expect(userModel.findOne).toHaveBeenCalledWith({
        emailVerificationTokenHash: expect.any(String),
      });

      expect(user.isEmailVerified).toBe(true);
      expect(user.emailVerificationTokenHash).toBeUndefined();
      expect(user.emailVerificationExpiresAt).toBeUndefined();

      expect(user.save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'Email verified successfully. You can now log in.',
      });
    });

    it('should throw UnauthorizedException for an invalid token', async () => {
      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.verifyEmail('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException for an expired token', async () => {
      const user = createUserMock({
        emailVerificationExpiresAt: new Date(Date.now() - 1000),
      });

      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(user),
      });

      await expect(service.verifyEmail('expired-token')).rejects.toThrow(
        'Email verification token has expired.',
      );

      expect(user.save).not.toHaveBeenCalled();
    });

    it('should reject a user without an expiration date', async () => {
      const user = createUserMock({
        emailVerificationExpiresAt: undefined,
      });

      userModel.findOne.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(user),
      });

      await expect(service.verifyEmail('token')).rejects.toThrow(
        'Email verification token has expired.',
      );
    });
  });

  // RESEND VERIFICATION EMAIL

  describe('resendVerificationEmail', () => {
    it('should resend a verification email', async () => {
      const user = createUserMock({
        isEmailVerified: false,
      });

      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.resendVerificationEmail(
        ' ABEBE@EXAMPLE.COM ',
      );

      expect(userModel.findOne).toHaveBeenCalledWith({
        email: 'abebe@example.com',
      });

      expect(user.save).toHaveBeenCalled();

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        'abebe@example.com',
        'Abebe Kebede',
        expect.any(String),
      );

      expect(result).toEqual({
        message: 'A new verification email has been sent.',
      });
    });

    it('should throw NotFoundException when account does not exist', async () => {
      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.resendVerificationEmail('unknown@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not resend when email is already verified', async () => {
      const user = createUserMock({
        isEmailVerified: true,
      });

      userModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.resendVerificationEmail('abebe@example.com');

      expect(result).toEqual({
        message: 'This email address is already verified.',
      });

      expect(emailService.sendVerificationEmail).not.toHaveBeenCalled();

      expect(user.save).not.toHaveBeenCalled();
    });
  });

  // FIND BY ID

  describe('findById', () => {
    it('should return a user without the password', async () => {
      const user = createUserMock();

      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.findById(userId);

      expect(userModel.findById).toHaveBeenCalledWith(userId);

      expect(result).toBe(user);
    });

    it('should return null when user does not exist', async () => {
      userModel.findById.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await service.findById(userId);

      expect(result).toBeNull();
    });
  });

  // FIND CLIENTS

  describe('findClients', () => {
    it('should return all clients without passwords', async () => {
      const users = [
        createUserMock(),
        createUserMock({
          _id: '507f1f77bcf86cd799439012',
          email: 'user2@example.com',
        }),
      ];

      userModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(users),
      });

      const result = await service.findClients();

      expect(userModel.find).toHaveBeenCalledWith({
        role: UserRole.CLIENT,
      });

      expect(result).toEqual(users);
    });
  });

  // FIND ALL USERS

  describe('findAll', () => {
    it('should return all users without passwords', async () => {
      const users = [
        createUserMock(),
        createUserMock({
          _id: '507f1f77bcf86cd799439012',
          role: UserRole.ADMIN,
          email: 'abebe@example.com',
        }),
      ];

      userModel.find.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(users),
      });

      const result = await service.findAll();

      expect(userModel.find).toHaveBeenCalledWith();

      expect(result).toEqual(users);
    });
  });

  // DELETE USER

  describe('deleteUser', () => {
    it('should delete an existing user successfully', async () => {
      const user = createUserMock();

      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      userModel.findByIdAndDelete.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.deleteUser(userId);

      expect(userModel.findById).toHaveBeenCalledWith(userId);

      expect(userModel.findByIdAndDelete).toHaveBeenCalledWith(userId);

      expect(result).toEqual({
        message: 'User account deleted successfully.',
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteUser(userId)).rejects.toThrow(
        NotFoundException,
      );

      expect(userModel.findByIdAndDelete).not.toHaveBeenCalled();
    });
  });

  // UPDATE ACTIVE STATUS

  describe('updateActiveStatus', () => {
    it('should activate a user successfully', async () => {
      const user = createUserMock({
        isActive: false,
      });

      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.updateActiveStatus(userId, true);

      expect(userModel.findById).toHaveBeenCalledWith(userId);

      expect(user.isActive).toBe(true);

      expect(user.save).toHaveBeenCalled();

      expect(result).toEqual({
        message: 'User active status updated successfully.',
        user: expect.objectContaining({
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: true,
          isEmailVerified: user.isEmailVerified,
        }),
      });
    });

    it('should deactivate a user successfully', async () => {
      const user = createUserMock({
        isActive: true,
      });

      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(user),
      });

      const result = await service.updateActiveStatus(userId, false);

      expect(user.isActive).toBe(false);
      expect(user.save).toHaveBeenCalled();
      expect(result.user.isActive).toBe(false);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      userModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.updateActiveStatus(userId, true)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
