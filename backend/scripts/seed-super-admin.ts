#!/usr/bin/env tsx
/**
 * Asigna SUPER_ADMIN al teléfono real de producción/pruebas internas.
 * No crea OTP fijo — login debe usar Twilio/demo según entorno.
 *
 * Usage: npm run db:seed-super-admin
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SUPER_ADMIN_PHONE = '+12144698637';
/** Documento requerido en login admin (no es bypass OTP). */
const SUPER_ADMIN_DUI = process.env.SUPER_ADMIN_DUI ?? '00000000-0';
const SUPER_ADMIN_NAME = process.env.SUPER_ADMIN_NAME ?? 'MOVI Super Admin';

async function main() {
  console.log('🔐 Configurando SUPER_ADMIN real:', SUPER_ADMIN_PHONE);

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
    console.log('✓ Usuario existente actualizado:', user.id);
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
    console.log('✓ Usuario creado:', user.id);
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

  console.log('\n=== SUPER ADMIN ===');
  console.log('  Teléfono:', SUPER_ADMIN_PHONE, '(US)');
  console.log('  Usuario:', created ? 'CREADO' : 'ENCONTRADO');
  console.log('  userId:', user.id);
  console.log('  staffRole:', profile.staffRole);
  console.log('  DUI login:', user.duiNumber ?? SUPER_ADMIN_DUI);
  console.log('  Ruta tras login: /admin');
  console.log('  OTP: Twilio real (sin código fijo en BD)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
