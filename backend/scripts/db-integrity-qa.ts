#!/usr/bin/env tsx
/** Integridad BD post-reset — huérfanos, duplicados, demo seed */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_PHONES = [
  '+50370801111',
  '+50370001111',
  '+50378214898',
  '+50371234567',
  '+50378981234',
  '+50376543210',
];

type R = { check: string; ok: boolean; detail?: string };
const results: R[] = [];

function rec(check: string, ok: boolean, detail?: string) {
  results.push({ check, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${check}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const demoUsers = await prisma.user.count({ where: { phoneNumber: { in: DEMO_PHONES } } });
  rec('Sin usuarios demo seed', demoUsers === 0, `found=${demoUsers}`);

  const dup = await prisma.$queryRaw<{ phoneNumber: string; c: number }[]>`
    SELECT "phoneNumber", COUNT(*)::int as c FROM "User" GROUP BY "phoneNumber" HAVING COUNT(*) > 1`;
  rec('Sin teléfonos duplicados', dup.length === 0, String(dup.length));

  const orphanOffers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT o.id FROM "TripOffer" o LEFT JOIN "Trip" t ON o."tripId" = t.id WHERE t.id IS NULL LIMIT 5`;
  rec('Sin ofertas huérfanas', orphanOffers.length === 0, String(orphanOffers.length));

  const orphanDrivers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT d.id FROM "Driver" d LEFT JOIN "User" u ON d."userId" = u.id WHERE u.id IS NULL LIMIT 5`;
  rec('Sin conductores huérfanos', orphanDrivers.length === 0, String(orphanDrivers.length));

  const orphanOwners = await prisma.$queryRaw<{ id: string }[]>`
    SELECT o.id FROM "Owner" o LEFT JOIN "User" u ON o."userId" = u.id WHERE u.id IS NULL LIMIT 5`;
  rec('Sin owners huérfanos', orphanOwners.length === 0, String(orphanOwners.length));

  const orphanBusinesses = await prisma.$queryRaw<{ id: string }[]>`
    SELECT b.id FROM "Business" b LEFT JOIN "User" u ON b."userId" = u.id WHERE u.id IS NULL LIMIT 5`;
  rec('Sin negocios huérfanos', orphanBusinesses.length === 0, String(orphanBusinesses.length));

  const corruptTrips = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Trip"
    WHERE "passengerId" IS NULL
       OR ("lifecycleStatus" = 'trip_completed' AND "driverId" IS NULL)
    LIMIT 5`;
  rec('Sin viajes corruptos', corruptTrips.length === 0, String(corruptTrips.length));

  const superAdmin = await prisma.user.findFirst({
    where: { phoneNumber: '+12144698637' },
    include: { adminStaffProfile: true },
  });
  rec(
    'SUPER_ADMIN presente',
    superAdmin?.role === 'admin' && superAdmin.adminStaffProfile?.staffRole === 'SUPER_ADMIN',
    superAdmin?.phoneNumber
  );

  const pass = results.filter((r) => r.ok).length;
  const fail = results.filter((r) => !r.ok).length;
  console.log(`\n=== DB INTEGRITY: PASS ${pass} | FAIL ${fail} ===`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
