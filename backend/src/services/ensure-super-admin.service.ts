import { prisma } from '../lib/prisma';
import { normalizePhone } from '../utils/phone';

export const SUPER_ADMIN_PHONE = '+12144698637';
export const SUPER_ADMIN_DUI = process.env.SUPER_ADMIN_DUI ?? '00000000-0';
export const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'MOVI Super Admin';

/** Busca usuario por teléfono canónico (+503 / +1). */
export async function findUserByPhone(phone: string) {
  const phoneNumber = normalizePhone(phone);
  if (!phoneNumber) return null;
  return prisma.user.findUnique({ where: { phoneNumber } });
}

/** Idempotente — garantiza SuperAdmin real en la BD activa. */
export async function ensureSuperAdmin(): Promise<{
  userId: string;
  created: boolean;
  staffRole: string;
}> {
  let user = await prisma.user.findUnique({ where: { phoneNumber: SUPER_ADMIN_PHONE } });
  let created = false;

  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'admin',
        phoneVerified: true,
        fullName: user.fullName || SUPER_ADMIN_NAME,
        duiNumber: user.duiNumber ?? SUPER_ADMIN_DUI,
      },
    });
  } else {
    user = await prisma.user.create({
      data: {
        fullName: SUPER_ADMIN_NAME,
        phoneNumber: SUPER_ADMIN_PHONE,
        duiNumber: SUPER_ADMIN_DUI,
        role: 'admin',
        phoneVerified: true,
      },
    });
    created = true;
  }

  const roleAssignment = await prisma.userRoleAssignment.findFirst({
    where: { userId: user.id, role: 'admin' },
  });
  if (!roleAssignment) {
    await prisma.userRoleAssignment.create({ data: { userId: user.id, role: 'admin' } });
  }

  const profile = await prisma.adminStaffProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, staffRole: 'SUPER_ADMIN' },
    update: { staffRole: 'SUPER_ADMIN' },
  });

  return { userId: user.id, created, staffRole: profile.staffRole };
}
