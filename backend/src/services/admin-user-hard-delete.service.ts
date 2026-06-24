import { prisma } from '../lib/prisma';
import { revokeAllRefreshTokensForUser } from '../lib/refreshToken';
import { phoneLookupVariants } from '../utils/phone';
import { clearLoginLockoutsForPhones } from './login-lockout.service';

type DeleteResult = { ok: true } | { ok: false; error: string };

async function cleanupDriverRecord(driverId: string) {
  await prisma.driverSession.updateMany({
    where: { driverId, disconnectedAt: null },
    data: { disconnectedAt: new Date() },
  });
  await prisma.tripOffer.deleteMany({ where: { driverId } });
  await prisma.trip.updateMany({
    where: { driverId },
    data: { driverId: null },
  });
  await prisma.locationPing.deleteMany({ where: { driverId } });
  await prisma.vehicleAssignment.deleteMany({ where: { driverId } });
}

async function releasePhoneFromSystem(phoneNumber: string) {
  const variants = phoneLookupVariants(phoneNumber);
  if (variants.length === 0) return;
  await prisma.otpChallenge.deleteMany({
    where: { phoneNumber: { in: variants } },
  });
  clearLoginLockoutsForPhones(variants);
}

/**
 * Elimina cuenta y perfil por completo — libera teléfono para nuevo registro.
 * No elimina SUPER_ADMIN ni cuentas admin.
 */
export async function hardDeleteUserAccount(userId: string): Promise<DeleteResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { owner: true, driver: true, adminStaffProfile: true },
  });
  if (!user) return { ok: false, error: 'Usuario no encontrado' };
  if (user.role === 'admin' || user.adminStaffProfile) {
    return { ok: false, error: 'No se puede eliminar una cuenta administrativa' };
  }

  if (user.owner) {
    const childDrivers = await prisma.driver.findMany({
      where: { ownerId: user.owner.id },
      select: { id: true, userId: true },
    });
    for (const child of childDrivers) {
      if (child.userId === userId) continue;
      const sub = await hardDeleteUserAccount(child.userId);
      if (!sub.ok) return sub;
    }
  }

  if (user.driver) {
    await cleanupDriverRecord(user.driver.id);
  }

  await revokeAllRefreshTokensForUser(userId);
  await releasePhoneFromSystem(user.phoneNumber);

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}

/** Hard-delete vehículo — libera placa y elimina conductor asignado si existe. */
export async function hardDeleteVehicleRecord(vehicleId: string): Promise<DeleteResult> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { driver: { select: { id: true, userId: true } } },
  });
  if (!vehicle) return { ok: false, error: 'Vehículo no encontrado' };

  if (vehicle.driver) {
    const driverDelete = await hardDeleteUserAccount(vehicle.driver.userId);
    if (!driverDelete.ok) return driverDelete;
  }

  await prisma.vehicleInvite.deleteMany({ where: { vehicleId } });
  await prisma.vehicleAssignment.deleteMany({ where: { vehicleId } });
  await prisma.driverSession.deleteMany({ where: { vehicleId } });
  await prisma.tripOffer.updateMany({ where: { vehicleId }, data: { vehicleId: null } });

  await prisma.vehicle.delete({ where: { id: vehicleId } });
  return { ok: true };
}
