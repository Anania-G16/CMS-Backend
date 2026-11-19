import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

// USER ROLE

export enum UserRole {
  CLIENT = 'CLIENT',
  ADMIN = 'ADMIN',
}

// USER SCHEMA

@Schema({
  timestamps: true,
})
export class User {
  // FULL NAME

  @Prop({
    required: true,
    trim: true,
  })
  fullName: string;

  // EMAIL

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  })
  email: string;

  // PASSWORD

  @Prop({
    required: true,
  })
  password: string;

  // ROLE

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.CLIENT,
  })
  role: UserRole;

  // ACTIVE STATUS

  @Prop({
    type: Boolean,
    default: true,
  })
  isActive: boolean;

  // EMAIL VERIFICATION STATUS

  @Prop({
    type: Boolean,
    default: false,
  })
  isEmailVerified: boolean;

  // EMAIL VERIFICATION TOKEN HASH

  @Prop({
    type: String,
    required: false,
    select: false,
  })
  emailVerificationTokenHash?: string;

  // EMAIL VERIFICATION TOKEN EXPIRATION

  @Prop({
    type: Date,
    required: false,
  })
  emailVerificationExpiresAt?: Date;

  // PASSWORD RESET TOKEN HASH

  @Prop({
    type: String,
    required: false,
    select: false,
  })
  passwordResetTokenHash?: string;

  // PASSWORD RESET TOKEN EXPIRATION

  @Prop({
    type: Date,
    required: false,
  })
  passwordResetExpiresAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
