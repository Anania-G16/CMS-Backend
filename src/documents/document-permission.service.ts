import { Injectable, NotFoundException } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import { PermissionEffect } from './dto/document-permission.dto';

import { Document, DocumentDocument } from './schemas/document.schema';

import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class DocumentPermissionService {
  constructor(
    @InjectModel(Document.name)
    private readonly documentModel: Model<DocumentDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  // GRANT / REVOKE

  async setPermission(
    documentId: string,
    userId: string,
    effect: PermissionEffect,
  ) {
    const document = await this.documentModel.findById(documentId).exec();

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    const user = await this.userModel.findById(userId).exec();

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    if (user.role !== UserRole.CLIENT) {
      throw new NotFoundException(
        'Permissions can only be assigned to clients.',
      );
    }

    const userObjectId = new Types.ObjectId(userId);

    if (effect === PermissionEffect.GRANT) {
      const alreadyAllowed = document.allowedUsers.some(
        (id) => id.toString() === userId,
      );

      if (!alreadyAllowed) {
        document.allowedUsers.push(userObjectId);
        await document.save();
      }

      return {
        message: 'User granted access to the document successfully.',
        documentId: document._id,
        userId: userObjectId,
        effect: PermissionEffect.GRANT,
      };
    }

    document.allowedUsers = document.allowedUsers.filter(
      (id) => id.toString() !== userId,
    );

    await document.save();

    return {
      message: 'User access revoked from the document successfully.',
      documentId: document._id,
      userId: userObjectId,
      effect: PermissionEffect.REVOKE,
    };
  }

  // GET DOCUMENT PERMISSIONS

  async findDocumentPermissions(documentId: string) {
    const document = await this.documentModel
      .findById(documentId)
      .populate('allowedUsers', 'fullName email role isActive isEmailVerified')
      .exec();

    if (!document) {
      throw new NotFoundException('Document not found.');
    }

    return document.allowedUsers;
  }
}
