import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';

import { Document, DocumentSchema } from './schemas/document.schema';

import {
  DocumentPermission,
  DocumentPermissionSchema,
} from './schemas/document-permission.schema';

import { User, UserSchema } from '../users/schemas/user.schema';

import { DocumentsController } from './documents.controller';

import { DocumentPermissionController } from './document-permission.controller';

import { DocumentsService } from './documents.service';

import { DocumentPermissionService } from './document-permission.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Document.name,
        schema: DocumentSchema,
      },
      {
        name: DocumentPermission.name,
        schema: DocumentPermissionSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],

  controllers: [DocumentsController, DocumentPermissionController],

  providers: [DocumentsService, DocumentPermissionService],

  exports: [DocumentsService, DocumentPermissionService],
})
export class DocumentsModule {}
