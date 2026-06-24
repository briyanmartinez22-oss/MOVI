#!/usr/bin/env tsx
/**
 * Limpieza segura para beta — elimina datos demo/QA y conserva SUPER_ADMIN real.
 * Usage: npm run db:reset-beta -- --confirm
 */
import { PrismaClient } from '@prisma/client';
import { runBetaPlatformReset } from '../src/services/beta-reset.service';
import { clearAllLoginLockouts, clearLoginLockoutsForPhones } from '../src/services/login-lockout.service';
import { normalizePhone } from '../src/utils/phone';

const prisma = new PrismaClient();

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('Voy a eliminar únicamente datos demo y conservar el SUPER_ADMIN real.');
  console.log('══════════════════════════════════════════════\n');

  const confirmed =
    process.argv.includes('--confirm') || process.env.CONFIRM_BETA_RESET === 'yes';
  if (!confirmed) {
    console.log('Modo simulación — no se eliminó nada.');
    console.log('Para ejecutar: npm run db:reset-beta -- --confirm');
    console.log('O bien: CONFIRM_BETA_RESET=yes npm run db:reset-beta\n');
    return;
  }

  const result = await runBetaPlatformReset(prisma);

  const extraPhones = (process.env.RESET_CLEAR_LOGIN_PHONES ?? '')
    .split(/[,;\s]+/)
    .map((p) => normalizePhone(p.trim()))
    .filter(Boolean);
  if (extraPhones.length > 0) {
    clearLoginLockoutsForPhones(extraPhones);
    console.log('Login lockouts cleared for:', extraPhones.join(', '));
  } else {
    clearAllLoginLockouts();
    console.log('All login lockouts cleared.');
  }

  console.log('\n=== BETA RESET COMPLETE ===');
  console.log('SUPER_ADMIN:', result.superAdminPhone);
  console.log('userId:', result.superAdminUserId);
  console.log('staffRole:', result.staffRole);
  console.log('Auditorías conservadas:', result.auditLogsKept);
  console.log('Total registros eliminados:', result.totalDeleted);
  Object.entries(result.deleted).forEach(([label, count]) => {
    if (count > 0) console.log(`  ${label}: ${count}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
