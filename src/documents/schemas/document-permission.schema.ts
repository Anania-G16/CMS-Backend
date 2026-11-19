import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DocumentPermissionDocument = HydratedDocument<DocumentPermission>;

export enum PermissionEffect {
  GRANT = 'GRANT',
  REVOKE = 'REVOKE',
}

@Schema({
  timestamps: true,
})
export class DocumentPermission {
  @Prop({
    type: Types.ObjectId,
    ref: 'Document',
    required: true,
  })
  documentId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: PermissionEffect,
    required: true,
  })
  effect: PermissionEffect;
}

export const DocumentPermissionSchema =
  SchemaFactory.createForClass(DocumentPermission);
