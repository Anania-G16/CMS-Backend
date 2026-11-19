import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { DocumentAccess, DocumentStatus } from '../schemas/document.schema';
import type { TiptapDocument } from '../types/tiptap.types';

export class CreateDocumentDto {
  // TITLE

  @ApiProperty({
    example: 'Getting Started',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  // SLUG

  @ApiProperty({
    example: 'getting-started',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  slug: string;

  // ICON

  @ApiPropertyOptional({
    example: 'book-open',
    description:
      'Icon identifier used by the frontend. Usually used for root documents.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  // CONTENT

  @ApiPropertyOptional({
    description: 'Optional Tiptap JSON document content.',
    example: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Welcome to the YGS documentation.',
            },
          ],
        },
      ],
    },
  })
  @IsOptional()
  @IsObject()
  content?: TiptapDocument;

  // PARENT

  @ApiPropertyOptional({
    example: '66b123456789abcdef123456',
    description: 'Parent document ID. Leave empty for a root document.',
  })
  @IsOptional()
  @IsMongoId()
  parentId?: string;

  // STATUS

  @ApiPropertyOptional({
    enum: DocumentStatus,
    example: DocumentStatus.DRAFT,
    default: DocumentStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(DocumentStatus)
  status?: DocumentStatus;

  // ACCESS LEVEL

  @ApiPropertyOptional({
    enum: DocumentAccess,
    example: DocumentAccess.PUBLIC,
    default: DocumentAccess.PUBLIC,
    description: 'Controls who can access this documentation.',
  })
  @IsOptional()
  @IsEnum(DocumentAccess)
  accessLevel?: DocumentAccess;

  // ALLOWED USERS

  @ApiPropertyOptional({
    type: [String],
    example: ['66b123456789abcdef123456'],
    description: 'Client user IDs allowed to access a PRIVATE document.',
  })
  @IsOptional()
  @IsArray()
  @IsMongoId({
    each: true,
  })
  allowedUsers?: string[];
}
