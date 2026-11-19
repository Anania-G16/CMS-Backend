import { ApiProperty } from '@nestjs/swagger';

import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class ReorderDocumentDto {
  @ApiProperty({
    example: 2,
    description:
      'The new position of the document among its siblings. Positions start from 1.',
  })
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  order: number;
}
