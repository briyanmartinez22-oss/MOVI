import { SetMetadata } from '@nestjs/common';
import type { AdminStaffRole } from '@prisma/client';

export const ADMIN_STAFF_KEY = 'adminStaffRoles';
export const ADMIN_PERMISSION_KEY = 'adminPermission';

export const AdminStaffRoles = (...roles: AdminStaffRole[]) =>
  SetMetadata(ADMIN_STAFF_KEY, roles);

export const RequirePermission = (permission: import('../../services/admin-permissions.service').AdminPermission) =>
  SetMetadata(ADMIN_PERMISSION_KEY, permission);
