import {
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Body,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UsersService } from './users.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth('access-token')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET CLIENTS

  @Get('clients')
  @ApiOperation({
    summary: 'Get all clients',
    description:
      'Returns all registered client accounts. Passwords are never returned.',
  })
  @ApiResponse({
    status: 200,
    description: 'Clients retrieved successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication is required.',
  })
  findClients() {
    return this.usersService.findClients();
  }

  // Promote Clinets to Admin

  @Patch(':id/promote')
  @ApiOperation({
    summary: 'Promote a client to administrator',
    description:
      'Allows an administrator to promote a verified and active client account to administrator.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB user ID of the client to promote.',
  })
  @ApiResponse({
    status: 200,
    description: 'User promoted to administrator successfully.',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can promote users.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'User is already an administrator.',
  })
  async promoteToAdmin(@Param('id') id: string) {
    return this.usersService.promoteToAdmin(id);
  }

  // GET USER BY ID

  @Get(':id')
  @ApiOperation({
    summary: 'Get user by ID',
    description:
      'Returns a single user account by its MongoDB ID. Password is never returned.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB user ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication is required.',
  })
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // ACTIVATE / DEACTIVATE USER

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Activate or deactivate a user',
    description: 'Admin can activate or deactivate an existing client account.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB user ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User active status updated successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication is required.',
  })
  updateActiveStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.updateActiveStatus(id, isActive);
  }

  // DELETE USER

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a user account',
    description:
      'Permanently deletes a user account. Only administrators can delete users.',
  })
  @ApiParam({
    name: 'id',
    example: '66b123456789abcdef123456',
    description: 'MongoDB user ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'User account deleted successfully.',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found.',
  })
  @ApiResponse({
    status: 401,
    description: 'Admin authentication is required.',
  })
  @ApiResponse({
    status: 403,
    description: 'Only administrators can delete users.',
  })
  deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}
