import { ApiProperty } from '@nestjs/swagger';

import { IsEnum, IsMongoId } from 'class-validator';

export enum PermissionEffect {
  GRANT = 'GRANT',
  REVOKE = 'REVOKE',
}

export class DocumentPermissionDto {
  @ApiProperty({
    example: '66b123456789abcdef123456',
    description: 'Client user ID.',
  })
  @IsMongoId()
  userId: string;

  @ApiProperty({
    enum: PermissionEffect,
    example: PermissionEffect.GRANT,
    description:
      'GRANT gives this client access. REVOKE explicitly removes access.',
  })
  @IsEnum(PermissionEffect)
  effect: PermissionEffect;
}
