import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import type { Request } from 'express';

import { DocumentsService } from './documents.service';

import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { DocumentPermissionDto } from './dto/document-permission.dto';
import { ReorderDocumentDto } from './dto/reorder-document.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Documents')
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // PUBLIC DOCUMENTATION

  @Get('tree')
  @ApiOperation({
    summary: 'Get public documentation tree',
    description:
      'Returns published documentation that is accessible to public users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public documentation tree retrieved successfully.',
  })
  findPublicTree() {
    return this.documentsService.findPublicTree();
  }

  @Get('root')
  @ApiOperation({
    summary: 'Get public root documents',
    description:
      'Returns published top-level documentation sections available to public users.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public root documents retrieved successfully.',
  })
  findPublicRootDocuments() {
    return this.documentsService.findRootDocuments();
  }

  @Get('slug/:slug')
  @ApiOperation({
    summary: 'Get public documentation by slug',
    description:
      'Returns a published documentation section that is publicly accessible using its slug.',
  })
  @ApiParam({
    name: 'slug',
    example: 'getting-started',
    description: 'Unique documentation slug.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public documentation retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'Public documentation not found.',
  })
  findPublicBySlug(@Param('slug') slug: string) {
    return this.documentsService.findPublicBySlug(slug);
  }

  @Get(':id/children/public')
  @ApiOperation({
    summary: 'Get public child sections',
    description:
      'Returns published child sections that are publicly accessible.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB ID of the parent documentation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Public child sections retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document ID.',
  })
  @ApiResponse({
    status: 404,
    description: 'Parent documentation not found.',
  })
  findPublicChildren(@Param('id') id: string) {
    return this.documentsService.findPublicChildren(id);
  }

  // CLIENT DOCUMENTATION

  @Get('client/tree')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get client documentation tree',
    description:
      'Returns published documentation accessible to the authenticated client based on document access permissions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client-accessible documentation tree retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  findClientTree(@Req() req: Request) {
    const user = req.user as {
      userId: string;
      role: string;
    };

    return this.documentsService.findClientTree(user.userId);
  }

  @Get('client/root')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get client root documents',
    description:
      'Returns published top-level documentation accessible to the authenticated client.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client-accessible root documents retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  findClientRootDocuments(@Req() req: Request) {
    const user = req.user as {
      userId: string;
      role: string;
    };

    return this.documentsService.findClientRootDocuments(user.userId);
  }

  @Get('client/slug/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get client documentation by slug',
    description:
      'Returns a published documentation section accessible to the authenticated client.',
  })
  @ApiParam({
    name: 'slug',
    example: 'getting-started',
    description: 'Unique documentation slug.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client documentation retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description:
      'The authenticated client does not have access to this documentation.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documentation not found.',
  })
  findClientBySlug(@Param('slug') slug: string, @Req() req: Request) {
    const user = req.user as {
      userId: string;
      role: string;
    };

    return this.documentsService.findClientBySlug(slug, user.userId);
  }

  @Get('client/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get client documentation by ID',
    description:
      'Returns a published documentation section accessible to the authenticated client.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB document ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client documentation retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document ID.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description:
      'The authenticated client does not have access to this documentation.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documentation not found.',
  })
  findClientOne(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as {
      userId: string;
      role: string;
    };

    return this.documentsService.findClientOne(id, user.userId);
  }

  @Get('client/:id/children')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get client child sections',
    description:
      'Returns child documentation sections accessible to the authenticated client.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB ID of the parent document.',
  })
  @ApiResponse({
    status: 200,
    description: 'Client child sections retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  findClientChildren(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as {
      userId: string;
      role: string;
    };

    return this.documentsService.findClientChildren(id, user.userId);
  }

  // ADMIN DOCUMENTATION

  @Get('admin/tree')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get complete documentation tree',
    description:
      'Returns the complete documentation hierarchy for administrators, including drafts and all access levels.',
  })
  @ApiResponse({
    status: 200,
    description: 'Complete documentation tree retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can access this endpoint.',
  })
  findAdminTree() {
    return this.documentsService.findAdminTree();
  }

  @Get('admin/slug/:slug')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get documentation by slug as admin',
    description:
      'Returns any documentation section by slug, regardless of publication status or access level.',
  })
  @ApiParam({
    name: 'slug',
    example: 'getting-started',
    description: 'Unique documentation slug.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documentation retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can access this endpoint.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documentation not found.',
  })
  findAdminBySlug(@Param('slug') slug: string) {
    return this.documentsService.findAdminBySlug(slug);
  }

  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get documentation by ID as admin',
    description:
      'Returns any documentation section by MongoDB ID, including drafts and restricted documents.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB document ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documentation retrieved successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document ID.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can access this endpoint.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documentation not found.',
  })
  findAdminOne(@Param('id') id: string) {
    return this.documentsService.findAdminOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create documentation',
    description:
      'Creates a documentation section. The administrator can specify status, access level, parent section, icon, and private-user permissions.',
  })
  @ApiBody({
    type: CreateDocumentDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Documentation created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid documentation data.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can create documentation.',
  })
  @ApiResponse({
    status: 409,
    description: 'A documentation with the same slug already exists.',
  })
  create(@Body() createDocumentDto: CreateDocumentDto) {
    return this.documentsService.create(createDocumentDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update documentation',
    description:
      'Updates documentation fields. Administrators can also change the access level and private-user permissions.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB document ID.',
  })
  @ApiBody({
    type: UpdateDocumentDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Documentation updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid documentation data or circular hierarchy.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can update documentation.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documentation not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'A documentation with the same slug already exists.',
  })
  update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(id, updateDocumentDto);
  }

  // REORDER DOCUMENT

  @Patch(':id/order')
  @ApiOperation({
    summary: 'Reorder a documentation item',
    description:
      'Changes the position of a document among its siblings with the same parent.',
  })
  @ApiParam({
    name: 'id',
    description: 'Document ID',
  })
  reorder(
    @Param('id') id: string,
    @Body() reorderDocumentDto: ReorderDocumentDto,
  ) {
    return this.documentsService.reorder(id, reorderDocumentDto.order);
  }

  @Patch(':id/permission')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Grant or revoke document permission',
    description:
      'Allows an administrator to grant or revoke access for a specific client on a PRIVATE document.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB ID of the documentation.',
  })
  @ApiBody({
    type: DocumentPermissionDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Document permission updated successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document ID or user ID.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can manage document permissions.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documentation or client user not found.',
  })
  updatePermission(
    @Param('id') id: string,
    @Body() permissionDto: DocumentPermissionDto,
  ) {
    return this.documentsService.updatePermission(
      id,
      permissionDto.userId,
      permissionDto.effect,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete documentation',
    description:
      'Deletes the selected documentation section and its nested child sections.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB document ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Documentation and child sections deleted successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid document ID.',
  })
  @ApiResponse({
    status: 401,
    description: 'Authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can delete documentation.',
  })
  @ApiResponse({
    status: 404,
    description: 'Documentation not found.',
  })
  remove(@Param('id') id: string) {
    return this.documentsService.remove(id);
  }
}
