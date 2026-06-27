#!/usr/bin/env tsx
/**
 * Normaliza estados inconsistentes de verificación MOVI.
 * Usage: npm run db:normalize-flow -- --confirm
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const confirmed = process.argv.includes('--confirm') || process.env.CONFIRM_FLOW_NORMALIZE === 'yes';
  if (!confirmed) {
    console.log('Simulación — no se modificó nada.');
    console.log('Ejecuta: npm run db:normalize-flow -- --confirm');
    return;
  }

  const ownerDraftReset = await prisma.owner.updateMany({
    where: {
      deletedAt: null,
      status: { in: ['documents_uploaded', 'selfie_pending'] },
    },
    data: { status: 'pending' },
  });

  const vehicleDraftReset = await prisma.vehicle.updateMany({
    where: {
      deletedAt: null,
      status: { in: ['documents_uploaded', 'incomplete'] },
    },
    data: { status: 'draft' },
  });

  console.log('[MOVI_REFACTOR_DEBUG]', {
    ownersNormalized: ownerDraftReset.count,
    vehiclesNormalized: vehicleDraftReset.count,
  });
  console.log('Normalización completada.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
