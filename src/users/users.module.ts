import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { ConfigModule } from '@nestjs/config';

import { User, UserSchema } from './schemas/user.schema';

import { UsersService } from './users.service';

import { UsersController } from './users.controller';

import { EmailService } from './email.service';

@Module({
  imports: [
    ConfigModule,

    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [UsersController],

  providers: [UsersService, EmailService],

  exports: [UsersService],
})
export class UsersModule {}
