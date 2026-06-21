import type { AdminStaffRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { canAccessStaffRole as checkStaffRole } from './admin-permissions.service';

export { canAccess, type AdminPermission, type AdminActor } from './admin-permissions.service';

const ROLE_RANK: Record<AdminStaffRole, number> = {
  SUPER_ADMIN: 100,
  OPS_ADMIN: 80,
  SUPPORT_ADMIN: 60,
  FINANCE_ADMIN: 60,
  COMPLIANCE_ADMIN: 60,
};

export async function getAdminStaffRole(userId: string): Promise<AdminStaffRole> {
  const profile = await prisma.adminStaffProfile.findUnique({ where: { userId } });
  if (profile) return profile.staffRole;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (user?.role === 'admin') return 'SUPER_ADMIN';
  return 'OPS_ADMIN';
}

export function canAccessStaffRole(actual: AdminStaffRole, allowed: AdminStaffRole[]): boolean {
  if (checkStaffRole(actual, allowed)) return true;
  if (actual === 'SUPER_ADMIN') return true;
  return allowed.some((r) => ROLE_RANK[actual] >= ROLE_RANK[r]);
}

export const OPS_ROLES: AdminStaffRole[] = ['SUPER_ADMIN', 'OPS_ADMIN'];
export const SUPPORT_ROLES: AdminStaffRole[] = ['SUPER_ADMIN', 'SUPPORT_ADMIN'];
export const FINANCE_ROLES: AdminStaffRole[] = ['SUPER_ADMIN', 'FINANCE_ADMIN'];
export const COMPLIANCE_ROLES: AdminStaffRole[] = ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'];
