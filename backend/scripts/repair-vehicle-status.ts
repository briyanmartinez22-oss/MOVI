#!/usr/bin/env tsx
/**
 * Repara vehículos rechazados automáticamente (sin revisión admin explícita).
 * Usage: npm run db:repair-vehicle-status -- --confirm
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AUTO_REJECT_PATTERNS = [
  /no coincide con el DUI/i,
  /Unidad rechazada/i,
  /tarjeta de circulación no coincide/i,
];

function looksAutoRejected(rejectReason: string | null, autoRejected: boolean): boolean {
  if (autoRejected) return true;
  if (!rejectReason) return true;
  return AUTO_REJECT_PATTERNS.some((p) => p.test(rejectReason));
}

async function main() {
  const confirmed =
    process.argv.includes('--confirm') || process.env.CONFIRM_VEHICLE_REPAIR === 'yes';

  const candidates = await prisma.vehicle.findMany({
    where: { status: 'rejected' },
    select: {
      id: true,
      plateNumber: true,
      unitNumber: true,
      rejectReason: true,
      autoRejected: true,
      createdAt: true,
    },
  });

  const toRepair = candidates.filter((v) => looksAutoRejected(v.rejectReason, v.autoRejected));

  console.log(`\nVehículos rechazados en BD: ${candidates.length}`);
  console.log(`Candidatos a reparación (auto/test): ${toRepair.length}\n`);

  if (toRepair.length === 0) {
    console.log('Nada que reparar.');
    return;
  }

  for (const v of toRepair) {
    console.log(
      ` - ${v.plateNumber} (#${v.unitNumber}) reason=${v.rejectReason ?? '(null)'} auto=${v.autoRejected}`
    );
  }

  if (!confirmed) {
    console.log('\nModo simulación — no se modificó nada.');
    console.log('Ejecuta: npm run db:repair-vehicle-status -- --confirm');
    return;
  }

  const ids = toRepair.map((v) => v.id);
  const result = await prisma.vehicle.updateMany({
    where: { id: { in: ids } },
    data: {
      status: 'under_review',
      rejectReason: null,
      autoRejected: false,
    },
  });

  console.log(`\n✓ Reparados: ${result.count} vehículo(s) → under_review (PENDING_REVIEW)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
