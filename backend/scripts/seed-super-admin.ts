#!/usr/bin/env tsx
/**
 * Asigna SUPER_ADMIN al teléfono real de producción/pruebas internas.
 * No crea OTP fijo — login debe usar Twilio/demo según entorno.
 *
 * Usage: npm run db:seed-super-admin
 */
import { PrismaClient } from '@prisma/client';
import { ensureSuperAdmin, SUPER_ADMIN_PHONE } from '../src/services/ensure-super-admin.service';

const prisma = new PrismaClient();

const SUPER_ADMIN_DUI = process.env.SUPER_ADMIN_DUI ?? '00000000-0';

async function main() {
  console.log('🔐 Configurando SUPER_ADMIN real:', SUPER_ADMIN_PHONE);

  const result = await ensureSuperAdmin();
  const user = await prisma.user.findUnique({ where: { id: result.userId } });

  console.log('\n=== SUPER ADMIN ===');
  console.log('  Teléfono:', SUPER_ADMIN_PHONE, '(US)');
  console.log('  Usuario:', result.created ? 'CREADO' : 'ENCONTRADO');
  console.log('  userId:', result.userId);
  console.log('  staffRole:', result.staffRole);
  console.log('  DUI login:', user?.duiNumber ?? SUPER_ADMIN_DUI);
  console.log('  Ruta tras login: /admin');
  console.log('  OTP: Twilio real (sin código fijo en BD)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
