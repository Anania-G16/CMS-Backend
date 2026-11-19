import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
} from 'class-validator';

export class RegisterClientDto {
  @ApiProperty({
    example: 'Abebe Kebede',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  fullName: string;

  @ApiProperty({
    example: 'abebe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: '+251911234567',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional({
    example: 'abebe',
    description: 'Optional username.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  username?: string;

  @ApiProperty({
    example: 'StrongPassword123!',
  })
  @IsString()
  @MinLength(6)
  password: string;
}
