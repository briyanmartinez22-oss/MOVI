import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_STAFF_KEY } from '../decorators/admin-staff.decorator';
import type { AuthPayload } from '../guards/jwt-auth.guard';
import {
  canAccessStaffRole,
  getAdminStaffRole,
} from '../../services/admin-staff.service';
import type { AdminStaffRole } from '@prisma/client';

@Injectable()
export class AdminStaffGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowed = this.reflector.getAllAndOverride<AdminStaffRole[]>(ADMIN_STAFF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed?.length) return true;

    const request = context.switchToHttp().getRequest<{ auth?: AuthPayload }>();
    if (!request.auth || request.auth.role !== 'admin') {
      throw new ForbiddenException('Permiso denegado');
    }

    const staffRole = await getAdminStaffRole(request.auth.userId);
    if (!canAccessStaffRole(staffRole, allowed)) {
      throw new ForbiddenException('Permiso denegado para este módulo');
    }
    return true;
  }
}
