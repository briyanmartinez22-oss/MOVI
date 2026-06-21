#!/usr/bin/env tsx
/**
 * Verifica SuperAdmin en la BD activa (DATABASE_URL).
 * Usage: npm run db:verify-super-admin
 */
import { PrismaClient } from '@prisma/client';
import { normalizePhone } from '../src/utils/phone';
import { SUPER_ADMIN_PHONE } from '../src/services/ensure-super-admin.service';

const prisma = new PrismaClient();

async function main() {
  console.log('DATABASE_URL host:', process.env.DATABASE_URL?.replace(/:[^:@/]+@/, ':***@') ?? '(unset)');
  console.log('Canonical phone:', SUPER_ADMIN_PHONE);

  for (const input of ['2144698637', '12144698637', '+12144698637']) {
    const normalized = normalizePhone(input);
    const user = await prisma.user.findUnique({
      where: { phoneNumber: normalized },
      include: { adminStaffProfile: true },
    });
    console.log(
      `  input=${input} normalized=${normalized} found=${!!user} role=${user?.role ?? '-'} staff=${user?.adminStaffProfile?.staffRole ?? '-'}`
    );
  }

  const canonical = await prisma.user.findUnique({
    where: { phoneNumber: SUPER_ADMIN_PHONE },
    include: { adminStaffProfile: true },
  });

  console.log('\n=== User (canonical) ===');
  console.log(
    JSON.stringify(
      {
        found: !!canonical,
        id: canonical?.id,
        phoneNumber: canonical?.phoneNumber,
        role: canonical?.role,
        duiNumber: canonical?.duiNumber,
        phoneVerified: canonical?.phoneVerified,
        staffRole: canonical?.adminStaffProfile?.staffRole ?? null,
      },
      null,
      2
    )
  );

  if (!canonical || canonical.role !== 'admin' || canonical.adminStaffProfile?.staffRole !== 'SUPER_ADMIN') {
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
