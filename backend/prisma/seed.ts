import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_OTP = '123456';

async function main() {
  console.log('🌱 Seeding MOVI development data...');

  await prisma.otpChallenge.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.tripOffer.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.tripRating.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.driverSession.deleteMany();
  await prisma.driverSubscription.deleteMany();
  await prisma.inviteCode.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.business.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.adminStaffProfile.deleteMany();
  await prisma.operationalAlert.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      fullName: 'Admin MOVI',
      phoneNumber: '+50370801111',
      duiNumber: '00000000-0',
      role: 'admin',
      phoneVerified: true,
    },
  });
  await prisma.userRoleAssignment.create({ data: { userId: admin.id, role: 'admin' } });
  await prisma.adminStaffProfile.create({
    data: { userId: admin.id, staffRole: 'OPS_ADMIN' },
  });

  /** Dev interno El Salvador — NO SuperAdmin principal; solo QA local con OTP demo. */
  const devInternalAdmin = await prisma.user.create({
    data: {
      fullName: 'Dev Internal Admin',
      phoneNumber: '+50370001111',
      duiNumber: '00000001-0',
      role: 'admin',
      phoneVerified: true,
    },
  });
  await prisma.userRoleAssignment.create({ data: { userId: devInternalAdmin.id, role: 'admin' } });
  await prisma.adminStaffProfile.create({
    data: { userId: devInternalAdmin.id, staffRole: 'OPS_ADMIN' },
  });

  await prisma.otpChallenge.create({
    data: {
      phoneNumber: '+50370001111',
      code: DEMO_OTP,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verified: false,
    },
  });

  /** SuperAdmin real — United States, OTP vía Twilio (sin challenge fijo en seed). */
  const REAL_SUPER_PHONE = '+12144698637';
  const realSuperAdmin = await prisma.user.create({
    data: {
      fullName: 'MOVI Super Admin',
      phoneNumber: REAL_SUPER_PHONE,
      duiNumber: '00000000-0',
      role: 'admin',
      phoneVerified: true,
    },
  });
  await prisma.userRoleAssignment.create({ data: { userId: realSuperAdmin.id, role: 'admin' } });
  await prisma.adminStaffProfile.create({
    data: { userId: realSuperAdmin.id, staffRole: 'SUPER_ADMIN' },
  });

  const passenger = await prisma.user.create({
    data: {
      fullName: 'Juan Pasajero',
      phoneNumber: '+50378214898',
      duiNumber: '71542253-8',
      role: 'passenger',
      phoneVerified: true,
    },
  });
  await prisma.userRoleAssignment.create({ data: { userId: passenger.id, role: 'passenger' } });

  const ownerUser = await prisma.user.create({
    data: {
      fullName: 'Carlos Dueño',
      phoneNumber: '+50371234567',
      duiNumber: '04567890-1',
      role: 'owner',
      phoneVerified: true,
      owner: {
        create: {
          name: 'Carlos Dueño',
          phone: '+50371234567',
          dui: '04567890-1',
          status: 'approved',
        },
      },
    },
    include: { owner: true },
  });
  await prisma.userRoleAssignment.create({ data: { userId: ownerUser.id, role: 'owner' } });

  const vehicle = await prisma.vehicle.create({
    data: {
      unitId: 'MOVI-UNIT-000001',
      ownerId: ownerUser.owner!.id,
      unitNumber: '101',
      plateNumber: 'P123456',
      associationName: 'Asoc. Centro',
      vehicleType: 'mototaxi',
      status: 'approved',
      brand: 'Honda',
      model: 'Wave',
      year: 2022,
      color: 'Rojo',
      passengerCapacity: 1,
    },
  });

  const invite = await prisma.inviteCode.create({
    data: {
      code: 'DRV101',
      vehicleId: vehicle.id,
      ownerId: ownerUser.owner!.id,
    },
  });

  const driverUser = await prisma.user.create({
    data: {
      fullName: 'Miguel Conductor',
      phoneNumber: '+50378981234',
      duiNumber: '12345678-9',
      role: 'driver',
      phoneVerified: true,
      driver: {
        create: {
          id: 'MOVI-DRV-000001',
          ownerId: ownerUser.owner!.id,
          vehicleId: vehicle.id,
          name: 'Miguel Conductor',
          phone: '+50378981234',
          status: 'approved',
          inviteCodeUsed: invite.code,
        },
      },
    },
    include: { driver: true },
  });
  await prisma.userRoleAssignment.create({ data: { userId: driverUser.id, role: 'driver' } });

  const trialEnds = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1);
  await prisma.driverSubscription.create({
    data: {
      driverId: driverUser.driver!.id,
      trialEndsAt: trialEnds,
      nextBillingAt: trialEnds,
    },
  });

  await prisma.inviteCode.update({
    where: { code: invite.code },
    data: { usedBy: driverUser.driver!.id, usedAt: new Date() },
  });

  const businessUser = await prisma.user.create({
    data: {
      fullName: 'Ana Negocio',
      phoneNumber: '+50376543210',
      duiNumber: '98765432-1',
      role: 'business',
      phoneVerified: true,
      business: {
        create: {
          businessName: 'Pizza Express',
          businessType: 'restaurant',
          responsibleDui: '98765432-1',
          businessPhone: '+50376543210',
          latitude: 13.6929,
          longitude: -89.2182,
          addressLabel: 'Centro San Salvador',
          status: 'approved',
        },
      },
    },
  });
  await prisma.userRoleAssignment.create({ data: { userId: businessUser.id, role: 'business' } });

  await prisma.otpChallenge.create({
    data: {
      phoneNumber: '+50378214898',
      code: DEMO_OTP,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verified: false,
    },
  });

  console.log('✅ Seed complete — cuentas demo El Salvador');
  console.log('  SuperAdmin (US): +12144698637 / DUI 00000000-0 / OTP Twilio → /admin');
  console.log('  Dev interno:     70001111 / DUI 00000001-0 / OTP 123456 (OPS, no SUPER)');
  console.log('  Admin QA:        70801111 / DUI 00000000-0 / OTP 123456 (OPS)');
  console.log('  Passenger: 78214898 / DUI 71542253-8 / OTP 123456');
  console.log('  Owner:     71234567 / DUI 04567890-1 / OTP 123456');
  console.log('  Driver:    78981234 / DUI 12345678-9 / OTP 123456');
  console.log('  Vehicle:   Unidad #101 aprobada, conductor asignado, suscripción en gracia');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
