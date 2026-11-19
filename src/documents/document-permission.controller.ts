import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

import { DocumentPermissionService } from './document-permission.service';
import { DocumentPermissionDto } from './dto/document-permission.dto';

@ApiTags('Document Permissions')
@Controller('documents')
export class DocumentPermissionController {
  constructor(private readonly permissionService: DocumentPermissionService) {}

  // GRANT / REVOKE ACCESS

  @Put(':documentId/permissions/:userId')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Grant or revoke document access for a client',
  })
  @ApiParam({
    name: 'documentId',
    example: '66b123456789abcdef123456',
  })
  @ApiParam({
    name: 'userId',
    example: '66b987654321abcdef123456',
  })
  @ApiBody({
    type: DocumentPermissionDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Document permission updated successfully.',
  })
  setPermission(
    @Param('documentId') documentId: string,
    @Param('userId') userId: string,
    @Body() dto: DocumentPermissionDto,
  ) {
    return this.permissionService.setPermission(documentId, userId, dto.effect);
  }

  // VIEW PERMISSIONS

  @Get(':documentId/permissions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get all client permissions for a document',
  })
  findPermissions(@Param('documentId') documentId: string) {
    return this.permissionService.findDocumentPermissions(documentId);
  }
}
