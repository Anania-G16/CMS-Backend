import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({
    example: 'Ambess Abadi',
    description: 'Client full name.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({
    example: 'abebe@gmail.com',
    description:
      'Client email address. A verification email will be sent here.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'Client password.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
