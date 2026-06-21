#!/usr/bin/env tsx
/**
 * Limpieza segura para beta — elimina datos demo/QA y conserva SUPER_ADMIN real.
 * Usage: npm run db:reset-beta -- --confirm
 */
import { PrismaClient } from '@prisma/client';
import {
  ensureSuperAdmin,
  SUPER_ADMIN_PHONE,
} from '../src/services/ensure-super-admin.service';

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

  const superAdmin = await ensureSuperAdmin();
  const keepUserId = superAdmin.userId;

  console.log(`Conservando SUPER_ADMIN: ${SUPER_ADMIN_PHONE} (${keepUserId})\n`);

  const counts: Record<string, number> = {};

  async function del(label: string, fn: () => Promise<{ count: number }>) {
    const { count } = await fn();
    counts[label] = count;
    console.log(`  ✓ ${label}: ${count}`);
  }

  await del('SupportTicketMessage', () => prisma.supportTicketMessage.deleteMany({}));
  await del('SupportTicket', () => prisma.supportTicket.deleteMany({}));
  await del('OperationalAlert', () => prisma.operationalAlert.deleteMany({}));
  await del('Notification', () =>
    prisma.notification.deleteMany({ where: { NOT: { userId: keepUserId } } })
  );
  await del('PushToken', () =>
    prisma.pushToken.deleteMany({ where: { NOT: { userId: keepUserId } } })
  );
  await del('Payment', () => prisma.payment.deleteMany({}));
  await del('ChatMessage', () => prisma.chatMessage.deleteMany({}));
  await del('TripRating', () => prisma.tripRating.deleteMany({}));
  await del('TripOffer', () => prisma.tripOffer.deleteMany({}));
  await del('Delivery', () => prisma.delivery.deleteMany({}));
  await del('LocationPing', () => prisma.locationPing.deleteMany({}));
  await del('Trip', () => prisma.trip.deleteMany({}));
  await del('DriverSession', () => prisma.driverSession.deleteMany({}));
  await del('DriverSubscription', () => prisma.driverSubscription.deleteMany({}));
  await del('VehicleAssignment', () => prisma.vehicleAssignment.deleteMany({}));
  await del('VerificationDocument', () => prisma.verificationDocument.deleteMany({}));
  await del('InviteCode', () => prisma.inviteCode.deleteMany({}));
  await del('Driver', () => prisma.driver.deleteMany({}));
  await del('Vehicle', () => prisma.vehicle.deleteMany({}));
  await del('Owner', () => prisma.owner.deleteMany({}));
  await del('Business', () => prisma.business.deleteMany({}));
  await del('TripHistory', () => prisma.tripHistory.deleteMany({}));
  await del('DeliveryHistory', () => prisma.deliveryHistory.deleteMany({}));
  await del('OtpChallenge', () => prisma.otpChallenge.deleteMany({}));
  await del('RefreshToken (no SUPER_ADMIN)', () =>
    prisma.refreshToken.deleteMany({ where: { NOT: { userId: keepUserId } } })
  );
  await del('AdminStaffProfile (no SUPER_ADMIN)', () =>
    prisma.adminStaffProfile.deleteMany({ where: { NOT: { userId: keepUserId } } })
  );
  await del('UserRoleAssignment (no SUPER_ADMIN)', () =>
    prisma.userRoleAssignment.deleteMany({ where: { NOT: { userId: keepUserId } } })
  );
  await del('Users demo/QA', () =>
    prisma.user.deleteMany({ where: { NOT: { id: keepUserId } } })
  );

  const verified = await ensureSuperAdmin();

  console.log('\n=== BETA RESET COMPLETE ===');
  console.log('SUPER_ADMIN:', SUPER_ADMIN_PHONE);
  console.log('userId:', verified.userId);
  console.log('staffRole:', verified.staffRole);
  console.log('Auditorías conservadas:', await prisma.auditLog.count());
  console.log('Total registros eliminados:', Object.values(counts).reduce((a, b) => a + b, 0));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
