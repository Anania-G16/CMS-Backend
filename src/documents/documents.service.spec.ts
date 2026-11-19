import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Types } from 'mongoose';

import { DocumentsService } from './documents.service';
import {
  Document,
  DocumentAccess,
  DocumentStatus,
} from './schemas/document.schema';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let model: any;

  const userId = new Types.ObjectId().toString();
  const documentId = new Types.ObjectId().toString();
  const parentId = new Types.ObjectId().toString();

  const publicDocument = {
    _id: new Types.ObjectId(documentId),
    title: 'Test Document',
    slug: 'test-document',
    icon: 'book',
    content: 'Test content',
    parentId: null,
    order: 0,
    status: DocumentStatus.PUBLISHED,
    accessLevel: DocumentAccess.PUBLIC,
    allowedUsers: [],
    createdAt: new Date(),
  };

  // QUERY MOCK

  const createQuery = (result: any) => {
    const query: any = {
      exec: jest.fn().mockResolvedValue(result),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
    };

    return query;
  };

  // SETUP

  beforeEach(async () => {
    const MockDocumentModel: any = jest.fn().mockImplementation((data) => ({
      ...data,
      _id: new Types.ObjectId(),
      save: jest.fn().mockResolvedValue({
        ...publicDocument,
        ...data,
      }),
    }));

    MockDocumentModel.findOne = jest.fn();
    MockDocumentModel.findById = jest.fn();
    MockDocumentModel.find = jest.fn();
    MockDocumentModel.deleteOne = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getModelToken(Document.name),
          useValue: MockDocumentModel,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    model = MockDocumentModel;

    jest.clearAllMocks();
  });

  // DEFINED

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // CREATE

  describe('create', () => {
    it('should create a document successfully', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      const savedDocument = {
        ...publicDocument,
        title: 'New Document',
        slug: 'new-document',
      };

      const save = jest.fn().mockResolvedValue(savedDocument);

      model.mockImplementationOnce(() => ({
        save,
      }));

      const result = await service.create({
        title: 'New Document',
        slug: 'new-document',
        content: 'New content',
      } as any);

      expect(result).toEqual(savedDocument);
      expect(model.findOne).toHaveBeenCalledWith({
        slug: 'new-document',
      });
      expect(save).toHaveBeenCalled();
    });

    it('should throw ConflictException when slug already exists', async () => {
      model.findOne.mockReturnValue(createQuery(publicDocument));

      await expect(
        service.create({
          title: 'Duplicate',
          slug: 'test-document',
          content: 'Content',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for private document without allowed users', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(
        service.create({
          title: 'Private',
          slug: 'private',
          content: 'Content',
          accessLevel: DocumentAccess.PRIVATE,
          allowedUsers: [],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid parent ID', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(
        service.create({
          title: 'Child',
          slug: 'child',
          content: 'Content',
          parentId: 'invalid-id',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when parent does not exist', async () => {
      model.findOne.mockReturnValue(createQuery(null));
      model.findById.mockReturnValue(createQuery(null));

      await expect(
        service.create({
          title: 'Child',
          slug: 'child',
          content: 'Content',
          parentId,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create a private document with allowed users', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      const savedDocument = {
        ...publicDocument,
        accessLevel: DocumentAccess.PRIVATE,
        allowedUsers: [new Types.ObjectId(userId)],
      };

      const save = jest.fn().mockResolvedValue(savedDocument);

      model.mockImplementationOnce(() => ({
        save,
      }));

      const result = await service.create({
        title: 'Private',
        slug: 'private',
        content: 'Private content',
        accessLevel: DocumentAccess.PRIVATE,
        allowedUsers: [userId],
      } as any);

      expect(result).toEqual(savedDocument);
      expect(save).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid allowed user ID', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(
        service.create({
          title: 'Private',
          slug: 'private',
          content: 'Content',
          accessLevel: DocumentAccess.PRIVATE,
          allowedUsers: ['invalid-user-id'],
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a child document when parent exists', async () => {
      model.findOne.mockReturnValue(createQuery(null));
      model.findById.mockReturnValue(createQuery(publicDocument));

      const savedDocument = {
        ...publicDocument,
        parentId: new Types.ObjectId(parentId),
      };

      const save = jest.fn().mockResolvedValue(savedDocument);

      model.mockImplementationOnce(() => ({
        save,
      }));

      const result = await service.create({
        title: 'Child',
        slug: 'child',
        content: 'Child content',
        parentId,
      } as any);

      expect(result).toEqual(savedDocument);
      expect(save).toHaveBeenCalled();
    });
  });

  // PUBLIC TREE

  describe('findPublicTree', () => {
    it('should return the public document tree', async () => {
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findPublicTree();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(publicDocument.title);
    });

    it('should build parent-child relationships', async () => {
      const parent = {
        ...publicDocument,
        _id: new Types.ObjectId(parentId),
        parentId: null,
        order: 0,
      };

      const child = {
        ...publicDocument,
        _id: new Types.ObjectId(documentId),
        parentId: new Types.ObjectId(parentId),
        order: 1,
      };

      model.find.mockReturnValue(createQuery([parent, child]));

      const result = await service.findPublicTree();

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0]._id).toEqual(child._id);
    });
  });

  // CLIENT TREE

  describe('findClientTree', () => {
    it('should reject an invalid user ID', async () => {
      await expect(service.findClientTree('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return documents accessible to the client', async () => {
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findClientTree(userId);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(publicDocument.title);
    });
  });

  // ADMIN TREE

  describe('findAdminTree', () => {
    it('should return the complete document tree', async () => {
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findAdminTree();

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(publicDocument.title);
    });
  });

  // ROOT DOCUMENTS

  describe('findRootDocuments', () => {
    it('should return published public root documents', async () => {
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findRootDocuments();

      expect(result).toEqual([publicDocument]);

      expect(model.find).toHaveBeenCalledWith({
        parentId: null,
        status: DocumentStatus.PUBLISHED,
        accessLevel: DocumentAccess.PUBLIC,
      });
    });
  });

  // CLIENT ROOT DOCUMENTS

  describe('findClientRootDocuments', () => {
    it('should reject an invalid user ID', async () => {
      await expect(
        service.findClientRootDocuments('invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return accessible root documents', async () => {
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findClientRootDocuments(userId);

      expect(result).toEqual([publicDocument]);
    });
  });

  // ADMIN GET BY ID

  describe('findAdminOne', () => {
    it('should return a document by ID', async () => {
      model.findById.mockReturnValue(createQuery(publicDocument));

      const result = await service.findAdminOne(documentId);

      expect(result).toEqual(publicDocument);
    });

    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.findAdminOne('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when document does not exist', async () => {
      model.findById.mockReturnValue(createQuery(null));

      await expect(service.findAdminOne(documentId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // PUBLIC GET BY ID

  describe('findPublicOne', () => {
    it('should return a published public document', async () => {
      model.findById.mockReturnValue(createQuery(publicDocument));

      const result = await service.findPublicOne(documentId);

      expect(result).toEqual(publicDocument);
    });

    it('should reject an unpublished document', async () => {
      model.findById.mockReturnValue(
        createQuery({
          ...publicDocument,
          status: DocumentStatus.DRAFT,
        }),
      );

      await expect(service.findPublicOne(documentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject a non-public document', async () => {
      model.findById.mockReturnValue(
        createQuery({
          ...publicDocument,
          accessLevel: DocumentAccess.CLIENT,
        }),
      );

      await expect(service.findPublicOne(documentId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // CLIENT GET BY ID

  describe('findClientOne', () => {
    it('should allow a client to access a public document', async () => {
      model.findOne.mockReturnValue(createQuery(publicDocument));

      const result = await service.findClientOne(documentId, userId);

      expect(result).toEqual(publicDocument);
    });

    it('should allow a client to access a CLIENT document', async () => {
      const document = {
        ...publicDocument,
        accessLevel: DocumentAccess.CLIENT,
      };

      model.findOne.mockReturnValue(createQuery(document));

      const result = await service.findClientOne(documentId, userId);

      expect(result).toEqual(document);
    });

    it('should allow an authorized user to access a PRIVATE document', async () => {
      const document = {
        ...publicDocument,
        accessLevel: DocumentAccess.PRIVATE,
        allowedUsers: [new Types.ObjectId(userId)],
      };

      model.findOne.mockReturnValue(createQuery(document));

      const result = await service.findClientOne(documentId, userId);

      expect(result).toEqual(document);
    });

    it('should reject an unauthorized user from a PRIVATE document', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(service.findClientOne(documentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject an unpublished document', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(service.findClientOne(documentId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ADMIN BY SLUG

  describe('findAdminBySlug', () => {
    it('should return a document by slug', async () => {
      model.findOne.mockReturnValue(createQuery(publicDocument));

      const result = await service.findAdminBySlug(publicDocument.slug);

      expect(result).toEqual(publicDocument);
    });

    it('should throw NotFoundException when slug does not exist', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(service.findAdminBySlug('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // PUBLIC BY SLUG

  describe('findPublicBySlug', () => {
    it('should return a published public document', async () => {
      model.findOne.mockReturnValue(createQuery(publicDocument));

      const result = await service.findPublicBySlug(publicDocument.slug);

      expect(result).toEqual(publicDocument);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(service.findPublicBySlug('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // CLIENT BY SLUG

  describe('findClientBySlug', () => {
    it('should reject an invalid user ID', async () => {
      await expect(
        service.findClientBySlug('test', 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return an accessible document', async () => {
      model.findOne.mockReturnValue(createQuery(publicDocument));

      const result = await service.findClientBySlug(
        publicDocument.slug,
        userId,
      );

      expect(result).toEqual(publicDocument);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(service.findClientBySlug('missing', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // PUBLIC CHILDREN

  describe('findPublicChildren', () => {
    it('should reject an invalid document ID', async () => {
      await expect(service.findPublicChildren('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when parent does not exist', async () => {
      model.findOne.mockReturnValue(createQuery(null));

      await expect(service.findPublicChildren(documentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return public children', async () => {
      model.findOne.mockReturnValue(createQuery(publicDocument));
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findPublicChildren(documentId);

      expect(result).toEqual([publicDocument]);
    });
  });

  // CLIENT CHILDREN

  describe('findClientChildren', () => {
    it('should reject an invalid user ID', async () => {
      await expect(
        service.findClientChildren(documentId, 'invalid-id'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return accessible children', async () => {
      model.findOne.mockReturnValue(createQuery(publicDocument));
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findClientChildren(documentId, userId);

      expect(result).toEqual([publicDocument]);
    });
  });

  // ADMIN CHILDREN

  describe('findChildren', () => {
    it('should reject an invalid document ID', async () => {
      await expect(service.findChildren('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when parent does not exist', async () => {
      model.findById.mockReturnValue(createQuery(null));

      await expect(service.findChildren(documentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return all children', async () => {
      model.findById.mockReturnValue(createQuery(publicDocument));
      model.find.mockReturnValue(createQuery([publicDocument]));

      const result = await service.findChildren(documentId);

      expect(result).toEqual([publicDocument]);
    });
  });

  // UPDATE

  describe('update', () => {
    it('should throw BadRequestException for invalid ID', async () => {
      await expect(service.update('invalid-id', {} as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when document does not exist', async () => {
      model.findById.mockReturnValue(createQuery(null));

      await expect(service.update(documentId, {} as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException when new slug already exists', async () => {
      const document = {
        ...publicDocument,
        save: jest.fn(),
      };

      model.findById.mockReturnValue(createQuery(document));
      model.findOne.mockReturnValue(createQuery(publicDocument));

      await expect(
        service.update(documentId, {
          slug: 'duplicate-slug',
        } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when making a document private without users', async () => {
      const document = {
        ...publicDocument,
        save: jest.fn(),
      };

      model.findById.mockReturnValue(createQuery(document));

      await expect(
        service.update(documentId, {
          accessLevel: DocumentAccess.PRIVATE,
          allowedUsers: [],
        } as any),
      ).rejects.toThrow(BadRequestException);

      expect(document.save).not.toHaveBeenCalled();
    });

    it('should update a document successfully', async () => {
      const document = {
        ...publicDocument,
        save: jest.fn().mockResolvedValue({
          ...publicDocument,
          title: 'Updated Document',
        }),
      };

      model.findById.mockReturnValue(createQuery(document));

      const result = await service.update(documentId, {
        title: 'Updated Document',
      } as any);

      expect(document.title).toBe('Updated Document');
      expect(document.save).toHaveBeenCalled();

      expect(result).toEqual({
        ...publicDocument,
        title: 'Updated Document',
      });
    });

    it('should clear allowed users when access changes away from PRIVATE', async () => {
      const privateDocument = {
        ...publicDocument,
        accessLevel: DocumentAccess.PRIVATE,
        allowedUsers: [new Types.ObjectId(userId)],
        save: jest.fn().mockResolvedValue(undefined),
      };

      model.findById.mockReturnValue(createQuery(privateDocument));

      await service.update(documentId, {
        accessLevel: DocumentAccess.PUBLIC,
      } as any);

      expect(privateDocument.allowedUsers).toEqual([]);
      expect(privateDocument.accessLevel).toBe(DocumentAccess.PUBLIC);
      expect(privateDocument.save).toHaveBeenCalled();
    });
  });

  // PERMISSIONS

  describe('updatePermission', () => {
    it('should grant access to a user', async () => {
      const document = {
        ...publicDocument,
        accessLevel: DocumentAccess.PRIVATE,
        allowedUsers: [],
        save: jest.fn().mockResolvedValue(undefined),
      };

      model.findById.mockReturnValue(createQuery(document));

      const result = await service.updatePermission(
        documentId,
        userId,
        'GRANT' as any,
      );

      expect(document.allowedUsers).toHaveLength(1);
      expect(document.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should revoke access from a user', async () => {
      const document = {
        ...publicDocument,
        accessLevel: DocumentAccess.PRIVATE,
        allowedUsers: [new Types.ObjectId(userId)],
        save: jest.fn().mockResolvedValue(undefined),
      };

      model.findById.mockReturnValue(createQuery(document));

      const result = await service.updatePermission(
        documentId,
        userId,
        'REVOKE' as any,
      );

      expect(document.allowedUsers).toHaveLength(0);
      expect(document.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  // REMOVE

  describe('remove', () => {
    it('should reject an invalid document ID', async () => {
      await expect(service.remove('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when document does not exist', async () => {
      model.findById.mockReturnValue(createQuery(null));

      await expect(service.remove(documentId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete a document and its subtree', async () => {
      model.findById.mockReturnValue(createQuery(publicDocument));
      model.find.mockReturnValue(createQuery([]));
      model.deleteOne.mockResolvedValue({
        deletedCount: 1,
      });

      const result = await service.remove(documentId);

      expect(result).toEqual({
        message: 'Documentation and its child sections deleted successfully.',
      });

      expect(model.deleteOne).toHaveBeenCalledWith({
        _id: expect.any(Types.ObjectId),
      });
    });

    it('should delete nested children', async () => {
      const childId = new Types.ObjectId();

      model.findById.mockReturnValue(createQuery(publicDocument));

      model.find
        .mockReturnValueOnce(
          createQuery([
            {
              _id: childId,
            },
          ]),
        )
        .mockReturnValueOnce(createQuery([]));

      model.deleteOne
        .mockResolvedValueOnce({ deletedCount: 1 })
        .mockResolvedValueOnce({ deletedCount: 1 });

      const result = await service.remove(documentId);

      expect(result).toEqual({
        message: 'Documentation and its child sections deleted successfully.',
      });

      expect(model.deleteOne).toHaveBeenCalledTimes(2);
    });
  });
});
