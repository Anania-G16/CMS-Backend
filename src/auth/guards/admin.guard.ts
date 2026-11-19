import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { UserRole } from '../../users/schemas/user.schema';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'User authentication information is missing.',
      );
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only administrators can manage documentation.',
      );
    }

    return true;
  }
}
