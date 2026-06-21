import { SetMetadata } from '@nestjs/common';
import type { AdminStaffRole } from '@prisma/client';

export const ADMIN_STAFF_KEY = 'adminStaffRoles';
export const AdminStaffRoles = (...roles: AdminStaffRole[]) =>
  SetMetadata(ADMIN_STAFF_KEY, roles);
