import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import type { TiptapDocument } from '../types/tiptap.types';

export type DocumentDocument = HydratedDocument<Document>;

// DOCUMENT STATUS

export enum DocumentStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
}

// DOCUMENT ACCESS

export enum DocumentAccess {
  PUBLIC = 'PUBLIC',
  CLIENT = 'CLIENT',
  PRIVATE = 'PRIVATE',
  ADMIN = 'ADMIN',
}

@Schema({
  timestamps: true,
})
export class Document {
  // TITLE

  @Prop({
    required: true,
    trim: true,
  })
  title: string;

  // SLUG

  @Prop({
    required: true,
    unique: true,
    trim: true,
  })
  slug: string;

  // ICON

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  icon?: string;

  // CONTENT

  @Prop({
    type: Object,
    required: false,
  })
  content?: TiptapDocument;

  // PARENT

  @Prop({
    type: Types.ObjectId,
    ref: 'Document',
    default: null,
  })
  parentId?: Types.ObjectId | null;

  // ORDER

  @Prop({
    type: Number,
    default: 0,
  })
  order: number;

  // STATUS

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status: DocumentStatus;

  // ACCESS LEVEL

  @Prop({
    type: String,
    enum: DocumentAccess,
    default: DocumentAccess.PUBLIC,
  })
  accessLevel: DocumentAccess;

  // USERS WITH PRIVATE ACCESS

  @Prop({
    type: [
      {
        type: Types.ObjectId,
        ref: 'User',
      },
    ],
    default: [],
  })
  allowedUsers: Types.ObjectId[];
}

export const DocumentSchema = SchemaFactory.createForClass(Document);
