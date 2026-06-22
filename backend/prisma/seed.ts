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
  await prisma.vehicleAssignment.deleteMany();
  await prisma.vehicleInvite.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.business.deleteMany();
  await prisma.userRoleAssignment.deleteMany();
  await prisma.adminStaffProfile.deleteMany();
  await prisma.operationalAlert.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  const realSuperAdmin = await prisma.user.create({
    data: {
      fullName: 'MOVI Super Admin',
      phoneNumber: '+12144698637',
      duiNumber: '00000000-0',
      role: 'admin',
      phoneVerified: true,
    },
  });
  await prisma.userRoleAssignment.create({ data: { userId: realSuperAdmin.id, role: 'admin' } });
  await prisma.adminStaffProfile.create({
    data: { userId: realSuperAdmin.id, staffRole: 'SUPER_ADMIN' },
  });

  console.log('✅ Seed complete — solo SUPER_ADMIN (+12144698637)');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
