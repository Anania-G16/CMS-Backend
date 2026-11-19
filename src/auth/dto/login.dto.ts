import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'abebe@gmail.com',
    description: 'User email address. Used by both clients and administrators.',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'StrongPassword123!',
    description: 'Account password.',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
