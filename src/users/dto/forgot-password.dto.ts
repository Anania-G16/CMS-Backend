import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'abebe@example.com',
    description: 'Client email address.',
  })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
