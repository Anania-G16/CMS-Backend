import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import {
  Document,
  DocumentAccess,
  DocumentDocument,
  DocumentStatus,
} from './schemas/document.schema';

import { CreateDocumentDto } from './dto/create-document.dto';

import { UpdateDocumentDto } from './dto/update-document.dto';

import { PermissionEffect } from './schemas/document-permission.schema';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectModel(Document.name)
    private readonly documentModel: Model<DocumentDocument>,
  ) {}

  // CREATE DOCUMENT

  async create(createDocumentDto: CreateDocumentDto) {
    const {
      title,
      slug,
      icon,
      content,
      parentId,
      status,
      accessLevel,
      allowedUsers,
    } = createDocumentDto;

    const existing = await this.documentModel.findOne({ slug }).exec();

    if (existing) {
      throw new ConflictException(
        'A document with the same slug already exists.',
      );
    }

    // Validate parent

    let parentObjectId: Types.ObjectId | null = null;

    if (parentId) {
      parentObjectId = this.toObjectId(parentId);

      const parent = await this.documentModel.findById(parentObjectId).exec();

      if (!parent) {
        throw new NotFoundException('Parent documentation not found.');
      }
    }

    // Validate PRIVATE access

    const finalAccess = accessLevel ?? DocumentAccess.PUBLIC;

    if (finalAccess === DocumentAccess.PRIVATE) {
      if (!allowedUsers?.length) {
        throw new BadRequestException(
          'Private documents must have at least one allowed user.',
        );
      }

      await this.validateUsers(allowedUsers);
    }

    // AUTOMATIC ORDER
    // Documents with the same parentId are ordered together.

    const lastSibling = await this.documentModel
      .findOne({
        parentId: parentObjectId,
      })
      .sort({
        order: -1,
      })
      .select('order')
      .lean()
      .exec();

    const nextOrder = lastSibling ? lastSibling.order + 1 : 1;

    // Root documents can have icons.
    // Nested documents do not need icons.

    const document = new this.documentModel({
      title,
      slug,
      icon: parentId ? undefined : icon,
      content,
      parentId: parentObjectId,

      // Automatically assigned.
      order: nextOrder,

      status: status ?? DocumentStatus.DRAFT,
      accessLevel: finalAccess,
      allowedUsers:
        finalAccess === DocumentAccess.PRIVATE
          ? this.toObjectIds(allowedUsers)
          : [],
    });

    return document.save();
  }

  // PUBLIC TREE

  async findPublicTree() {
    const documents = await this.documentModel
      .find({
        status: DocumentStatus.PUBLISHED,
        accessLevel: DocumentAccess.PUBLIC,
      })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();

    return this.buildTree(documents);
  }

  // ADMIN TREE

  async findAdminTree() {
    const documents = await this.documentModel
      .find()
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();

    return this.buildTree(documents);
  }

  // CLIENT TREE

  async findClientTree(userId: string) {
    const userObjectId = this.toObjectId(userId);

    const documents = await this.documentModel
      .find({
        status: DocumentStatus.PUBLISHED,
        $or: [
          {
            accessLevel: DocumentAccess.PUBLIC,
          },
          {
            accessLevel: DocumentAccess.CLIENT,
          },
          {
            accessLevel: DocumentAccess.PRIVATE,
            allowedUsers: userObjectId,
          },
        ],
      })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();

    return this.buildTree(documents);
  }

  // PUBLIC ROOT DOCUMENTS

  async findRootDocuments() {
    return this.documentModel
      .find({
        parentId: null,
        status: DocumentStatus.PUBLISHED,
        accessLevel: DocumentAccess.PUBLIC,
      })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();
  }

  // CLIENT ROOT DOCUMENTS

  async findClientRootDocuments(userId: string) {
    const userObjectId = this.toObjectId(userId);

    return this.documentModel
      .find({
        parentId: null,
        status: DocumentStatus.PUBLISHED,
        $or: [
          {
            accessLevel: DocumentAccess.PUBLIC,
          },
          {
            accessLevel: DocumentAccess.CLIENT,
          },
          {
            accessLevel: DocumentAccess.PRIVATE,
            allowedUsers: userObjectId,
          },
        ],
      })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();
  }

  // PUBLIC BY SLUG

  async findPublicBySlug(slug: string) {
    const document = await this.documentModel
      .findOne({
        slug,
        status: DocumentStatus.PUBLISHED,
        accessLevel: DocumentAccess.PUBLIC,
      })
      .lean()
      .exec();

    if (!document) {
      throw new NotFoundException('Published documentation not found.');
    }

    return document;
  }

  // CLIENT BY SLUG

  async findClientBySlug(slug: string, userId: string) {
    const userObjectId = this.toObjectId(userId);

    const document = await this.documentModel
      .findOne({
        slug,
        status: DocumentStatus.PUBLISHED,
        $or: [
          {
            accessLevel: DocumentAccess.PUBLIC,
          },
          {
            accessLevel: DocumentAccess.CLIENT,
          },
          {
            accessLevel: DocumentAccess.PRIVATE,
            allowedUsers: userObjectId,
          },
        ],
      })
      .lean()
      .exec();

    if (!document) {
      throw new NotFoundException(
        'Documentation not found or you do not have access to it.',
      );
    }

    return document;
  }

  // ADMIN BY SLUG

  async findAdminBySlug(slug: string) {
    const document = await this.documentModel.findOne({ slug }).lean().exec();

    if (!document) {
      throw new NotFoundException('Documentation not found.');
    }

    return document;
  }

  // PUBLIC BY ID

  async findOne(id: string) {
    const objectId = this.toObjectId(id);

    const document = await this.documentModel
      .findOne({
        _id: objectId,
        status: DocumentStatus.PUBLISHED,
        accessLevel: DocumentAccess.PUBLIC,
      })
      .lean()
      .exec();

    if (!document) {
      throw new NotFoundException('Published documentation not found.');
    }

    return document;
  }

  // PUBLIC BY ID

  async findPublicOne(id: string) {
    const objectId = this.toObjectId(id);

    const document = await this.documentModel.findById(objectId).lean().exec();

    if (!document) {
      throw new NotFoundException('Published documentation not found.');
    }

    if (document.status !== DocumentStatus.PUBLISHED) {
      throw new NotFoundException('Published documentation not found.');
    }

    if (document.accessLevel !== DocumentAccess.PUBLIC) {
      throw new ForbiddenException(
        'You do not have access to this documentation.',
      );
    }

    return document;
  }

  // CLIENT BY ID

  async findClientOne(id: string, userId: string) {
    const objectId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    const document = await this.documentModel
      .findOne({
        _id: objectId,
        status: DocumentStatus.PUBLISHED,
        $or: [
          {
            accessLevel: DocumentAccess.PUBLIC,
          },
          {
            accessLevel: DocumentAccess.CLIENT,
          },
          {
            accessLevel: DocumentAccess.PRIVATE,
            allowedUsers: userObjectId,
          },
        ],
      })
      .lean()
      .exec();

    if (!document) {
      throw new NotFoundException(
        'Documentation not found or you do not have access to it.',
      );
    }

    return document;
  }

  // ADMIN BY ID

  async findAdminOne(id: string) {
    const objectId = this.toObjectId(id);

    const document = await this.documentModel.findById(objectId).lean().exec();

    if (!document) {
      throw new NotFoundException('Documentation not found.');
    }

    return document;
  }

  // PUBLIC CHILDREN

  async findPublicChildren(id: string) {
    const parentId = this.toObjectId(id);

    const parent = await this.documentModel
      .findOne({
        _id: parentId,
        status: DocumentStatus.PUBLISHED,
        accessLevel: DocumentAccess.PUBLIC,
      })
      .exec();

    if (!parent) {
      throw new NotFoundException('Parent documentation not found.');
    }

    return this.documentModel
      .find({
        parentId,
        status: DocumentStatus.PUBLISHED,
        accessLevel: DocumentAccess.PUBLIC,
      })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();
  }

  // CLIENT CHILDREN

  async findClientChildren(id: string, userId: string) {
    const parentId = this.toObjectId(id);
    const userObjectId = this.toObjectId(userId);

    const parent = await this.documentModel
      .findOne({
        _id: parentId,
        status: DocumentStatus.PUBLISHED,
        $or: [
          {
            accessLevel: DocumentAccess.PUBLIC,
          },
          {
            accessLevel: DocumentAccess.CLIENT,
          },
          {
            accessLevel: DocumentAccess.PRIVATE,
            allowedUsers: userObjectId,
          },
        ],
      })
      .exec();

    if (!parent) {
      throw new NotFoundException(
        'Parent documentation not found or you do not have access to it.',
      );
    }

    return this.documentModel
      .find({
        parentId,
        status: DocumentStatus.PUBLISHED,
        $or: [
          {
            accessLevel: DocumentAccess.PUBLIC,
          },
          {
            accessLevel: DocumentAccess.CLIENT,
          },
          {
            accessLevel: DocumentAccess.PRIVATE,
            allowedUsers: userObjectId,
          },
        ],
      })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();
  }

  // ADMIN CHILDREN

  async findChildren(id: string) {
    const parentId = this.toObjectId(id);

    const parent = await this.documentModel.findById(parentId).exec();

    if (!parent) {
      throw new NotFoundException('Parent documentation not found.');
    }

    return this.documentModel
      .find({
        parentId,
      })
      .sort({
        order: 1,
        createdAt: 1,
      })
      .lean()
      .exec();
  }

  // UPDATE

  async update(id: string, updateDocumentDto: UpdateDocumentDto) {
    const objectId = this.toObjectId(id);

    const document = await this.documentModel.findById(objectId).exec();

    if (!document) {
      throw new NotFoundException('Documentation not found.');
    }

    const {
      title,
      slug,
      icon,
      content,
      parentId,
      status,
      accessLevel,
      allowedUsers,
    } = updateDocumentDto;

    // Slug

    if (slug !== undefined && slug !== document.slug) {
      const duplicate = await this.documentModel
        .findOne({
          slug,
          _id: {
            $ne: objectId,
          },
        })
        .exec();

      if (duplicate) {
        throw new ConflictException(
          'A document with the same slug already exists.',
        );
      }

      document.slug = slug;
    }

    // Parent

    if (parentId !== undefined) {
      if (parentId === id) {
        throw new BadRequestException('A document cannot be its own parent.');
      }

      if (parentId) {
        const parentObjectId = this.toObjectId(parentId);

        const parent = await this.documentModel.findById(parentObjectId).exec();

        if (!parent) {
          throw new NotFoundException('Parent documentation not found.');
        }

        await this.ensureNoCircularHierarchy(id, parentId);

        document.parentId = parentObjectId;

        // Nested document does not need root icon.
        document.icon = undefined;
      } else {
        document.parentId = null;

        if (icon !== undefined) {
          document.icon = icon;
        }
      }
    }

    // Basic fields

    if (title !== undefined) {
      document.title = title;
    }

    if (content !== undefined) {
      document.content = content;
    }

    if (status !== undefined) {
      document.status = status;
    }

    if (icon !== undefined && !parentId) {
      document.icon = icon;
    }

    // Access

    const previousAccess = document.accessLevel;

    if (accessLevel !== undefined) {
      document.accessLevel = accessLevel;
    }

    const finalAccess = document.accessLevel;

    if (finalAccess === DocumentAccess.PRIVATE) {
      if (allowedUsers !== undefined) {
        if (!allowedUsers.length) {
          throw new BadRequestException(
            'Private documents must have at least one allowed user.',
          );
        }

        await this.validateUsers(allowedUsers);

        document.allowedUsers = this.toObjectIds(allowedUsers);
      } else if (previousAccess !== DocumentAccess.PRIVATE) {
        throw new BadRequestException(
          'Private documents must have at least one allowed user.',
        );
      }
    } else {
      document.allowedUsers = [];
    }

    // Save updated document

    return document.save();
  }

  // GRANT / REVOKE PRIVATE ACCESS

  async updatePermission(
    documentId: string,
    userId: string,
    effect: PermissionEffect,
  ) {
    const documentObjectId = this.toObjectId(documentId);

    const userObjectId = this.toObjectId(userId);

    const document = await this.documentModel.findById(documentObjectId).exec();

    if (!document) {
      throw new NotFoundException('Documentation not found.');
    }

    if (document.accessLevel !== DocumentAccess.PRIVATE) {
      throw new BadRequestException(
        'User-specific permissions can only be managed for PRIVATE documents.',
      );
    }

    const alreadyAllowed = document.allowedUsers.some(
      (id) => id.toString() === userObjectId.toString(),
    );

    if (effect === PermissionEffect.GRANT) {
      if (!alreadyAllowed) {
        document.allowedUsers.push(userObjectId);
      }
    }

    if (effect === PermissionEffect.REVOKE) {
      document.allowedUsers = document.allowedUsers.filter(
        (id) => id.toString() !== userObjectId.toString(),
      );
    }

    await document.save();

    return {
      message:
        effect === PermissionEffect.GRANT
          ? 'User access granted successfully.'
          : 'User access revoked successfully.',
      documentId: document._id,
      userId: userObjectId,
      effect,
    };
  }

  // REORDER DOCUMENT

  async reorder(id: string, newOrder: number) {
    const objectId = this.toObjectId(id);

    if (!Number.isInteger(newOrder) || newOrder < 1) {
      throw new BadRequestException(
        'Order must be a positive integer starting from 1.',
      );
    }

    const document = await this.documentModel.findById(objectId).exec();

    if (!document) {
      throw new NotFoundException('Documentation not found.');
    }

    const oldOrder = document.order;

    // Nothing to do.
    if (oldOrder === newOrder) {
      return document;
    }

    // FIND SIBLINGS

    const siblings = await this.documentModel
      .find({
        parentId: document.parentId,
        _id: {
          $ne: objectId,
        },
      })
      .sort({
        order: 1,
      })
      .exec();

    // DETERMINE MAXIMUM VALID POSITION

    const maximumOrder = siblings.length + 1;

    if (newOrder > maximumOrder) {
      throw new BadRequestException(
        `Order cannot be greater than ${maximumOrder}.`,
      );
    }

    // MOVING DOWN

    if (newOrder > oldOrder) {
      await this.documentModel.updateMany(
        {
          parentId: document.parentId,
          order: {
            $gt: oldOrder,
            $lte: newOrder,
          },
        },
        {
          $inc: {
            order: -1,
          },
        },
      );
    }

    // MOVING UP

    if (newOrder < oldOrder) {
      await this.documentModel.updateMany(
        {
          parentId: document.parentId,
          order: {
            $gte: newOrder,
            $lt: oldOrder,
          },
        },
        {
          $inc: {
            order: 1,
          },
        },
      );
    }

    // UPDATE MOVED DOCUMENT

    document.order = newOrder;

    await document.save();

    return document;
  }

  // DELETE

  async remove(id: string) {
    const objectId = this.toObjectId(id);

    const document = await this.documentModel.findById(objectId).exec();

    if (!document) {
      throw new NotFoundException('Documentation not found.');
    }

    await this.deleteTree(objectId);

    return {
      message: 'Documentation and its child sections deleted successfully.',
    };
  }

  // DELETE TREE

  private async deleteTree(parentId: Types.ObjectId) {
    const children = await this.documentModel
      .find({
        parentId,
      })
      .select('_id')
      .lean()
      .exec();

    for (const child of children) {
      await this.deleteTree(child._id);
    }

    await this.documentModel.deleteOne({
      _id: parentId,
    });
  }

  // BUILD TREE

  private buildTree(documents: any[]) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    for (const document of documents) {
      const item = {
        ...document,
        children: [],
      };

      map.set(document._id.toString(), item);
    }

    for (const document of documents) {
      const item = map.get(document._id.toString());

      if (document.parentId) {
        const parent = map.get(document.parentId.toString());

        if (parent) {
          parent.children.push(item);
        }
      } else {
        roots.push(item);
      }
    }

    return roots;
  }

  // VALIDATE USERS

  private async validateUsers(userIds: string[]) {
    if (!userIds?.length) {
      return;
    }

    const validIds = userIds.filter((id) => Types.ObjectId.isValid(id));

    if (validIds.length !== userIds.length) {
      throw new BadRequestException('One or more user IDs are invalid.');
    }
  }

  // OBJECT ID HELPERS

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid MongoDB document ID.');
    }

    return new Types.ObjectId(id);
  }

  private toObjectIds(ids?: string[]): Types.ObjectId[] {
    if (!ids?.length) {
      return [];
    }

    return ids.map((id) => this.toObjectId(id));
  }

  // CIRCULAR HIERARCHY PROTECTION

  private async ensureNoCircularHierarchy(
    documentId: string,
    parentId: string,
  ) {
    let currentParentId: Types.ObjectId | null = this.toObjectId(parentId);

    const documentObjectId = this.toObjectId(documentId);

    while (currentParentId) {
      if (currentParentId.toString() === documentObjectId.toString()) {
        throw new BadRequestException(
          'Circular documentation hierarchy detected.',
        );
      }

      const parent = await this.documentModel
        .findById(currentParentId)
        .select('parentId')
        .lean()
        .exec();

      if (!parent?.parentId) {
        currentParentId = null;
      } else {
        currentParentId = parent.parentId;
      }
    }
  }
}
