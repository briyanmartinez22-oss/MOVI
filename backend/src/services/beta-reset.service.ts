import { PrismaClient } from '@prisma/client';
import {
  ensureSuperAdmin,
  SUPER_ADMIN_PHONE,
} from './ensure-super-admin.service';
import { clearAllLoginLockouts } from './login-lockout.service';

export type BetaResetCounts = Record<string, number>;

export type BetaResetResult = {
  superAdminPhone: string;
  superAdminUserId: string;
  staffRole: string;
  deleted: BetaResetCounts;
  auditLogsKept: number;
  totalDeleted: number;
};

/** Elimina datos demo/QA y conserva únicamente el SUPER_ADMIN real. */
export async function runBetaPlatformReset(
  prisma: PrismaClient,
  options: { dryRun?: boolean } = {}
): Promise<BetaResetResult> {
  const dryRun = options.dryRun ?? false;
  const superAdmin = await ensureSuperAdmin();
  const keepUserId = superAdmin.userId;
  const counts: BetaResetCounts = {};

  async function del(label: string, fn: () => Promise<{ count: number }>) {
    if (dryRun) {
      counts[label] = 0;
      return;
    }
    const { count } = await fn();
    counts[label] = count;
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
  await del('VehicleInvite', () => prisma.vehicleInvite.deleteMany({}));
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
  await del('AuditLog', () => prisma.auditLog.deleteMany({}));

  if (!dryRun) {
    clearAllLoginLockouts();
  }

  const verified = dryRun ? superAdmin : await ensureSuperAdmin();
  const auditLogsKept = await prisma.auditLog.count();
  const totalDeleted = Object.values(counts).reduce((a, b) => a + b, 0);

  return {
    superAdminPhone: SUPER_ADMIN_PHONE,
    superAdminUserId: verified.userId,
    staffRole: verified.staffRole,
    deleted: counts,
    auditLogsKept,
    totalDeleted,
  };
}

export async function getPlatformDataSummary(prisma: PrismaClient) {
  const [
    trips,
    tripOffers,
    tripsRequested,
    tripsActive,
    drivers,
    owners,
    vehicles,
    passengers,
    businesses,
    alerts,
    users,
  ] = await Promise.all([
    prisma.trip.count(),
    prisma.tripOffer.count(),
    prisma.trip.count({ where: { lifecycleStatus: 'requested' } }),
    prisma.trip.count({
      where: {
        lifecycleStatus: {
          in: [
            'requested',
            'offered',
            'accepted',
            'driver_arriving',
            'driver_arrived',
            'trip_started',
          ],
        },
      },
    }),
    prisma.driver.count(),
    prisma.owner.count(),
    prisma.vehicle.count(),
    prisma.user.count({ where: { role: 'passenger' } }),
    prisma.business.count(),
    prisma.operationalAlert.count({ where: { status: 'open' } }),
    prisma.user.count(),
  ]);

  return {
    trips,
    tripOffers,
    tripsRequested,
    tripsActive,
    drivers,
    owners,
    vehicles,
    passengers,
    businesses,
    alertsOpen: alerts,
    users,
  };
}
