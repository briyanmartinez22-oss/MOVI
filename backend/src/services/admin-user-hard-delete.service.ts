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
 * Elimina solo el vehículo y sus dependencias directas.
 * No elimina el dueño ni la cuenta de usuario del conductor asignado.
 */
export async function hardDeleteVehicleRecord(vehicleId: string): Promise<DeleteResult> {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { driver: { select: { id: true } } },
  });
  if (!vehicle) return { ok: false, error: 'Vehículo no encontrado' };

  if (vehicle.driver) {
    await cleanupDriverRecord(vehicle.driver.id);
    await prisma.verificationDocument.deleteMany({ where: { driverId: vehicle.driver.id } });
  }

  await prisma.vehicleInvite.deleteMany({ where: { vehicleId } });
  await prisma.vehicleAssignment.deleteMany({ where: { vehicleId } });
  await prisma.driverSession.deleteMany({ where: { vehicleId } });
  await prisma.tripOffer.updateMany({ where: { vehicleId }, data: { vehicleId: null } });
  await prisma.verificationDocument.deleteMany({ where: { vehicleId } });

  await prisma.vehicle.delete({ where: { id: vehicleId } });
  return { ok: true };
}

/**
 * Elimina un dueño específico, sus vehículos e invitaciones.
 * Libera teléfono/DUI del dueño para nuevo registro.
 * No elimina otros owners ni ejecuta reset beta.
 */
export async function hardDeleteOwnerRecord(ownerId: string): Promise<DeleteResult> {
  const owner = await prisma.owner.findUnique({
    where: { id: ownerId },
    include: {
      user: true,
      vehicles: { select: { id: true } },
      drivers: { select: { id: true } },
    },
  });
  if (!owner) return { ok: false, error: 'Dueño no encontrado' };
  if (owner.user.role === 'admin') {
    return { ok: false, error: 'No se puede eliminar una cuenta administrativa' };
  }

  for (const driver of owner.drivers) {
    await cleanupDriverRecord(driver.id);
    await prisma.verificationDocument.deleteMany({ where: { driverId: driver.id } });
  }

  for (const vehicle of owner.vehicles) {
    const deleted = await hardDeleteVehicleRecord(vehicle.id);
    if (!deleted.ok) return deleted;
  }

  await prisma.vehicleInvite.deleteMany({ where: { ownerId } });
  await prisma.verificationDocument.deleteMany({ where: { ownerId } });

  await revokeAllRefreshTokensForUser(owner.userId);
  await releasePhoneFromSystem(owner.user.phoneNumber);

  await prisma.user.delete({ where: { id: owner.userId } });
  return { ok: true };
}

/**
 * Elimina una cuenta de usuario individual (pasajero, conductor, comercio).
 * Para dueños usa hardDeleteOwnerRecord (alcance del owner, no global).
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
    return hardDeleteOwnerRecord(user.owner.id);
  }

  if (user.driver) {
    await cleanupDriverRecord(user.driver.id);
    await prisma.verificationDocument.deleteMany({ where: { driverId: user.driver.id } });
  }

  await revokeAllRefreshTokensForUser(userId);
  await releasePhoneFromSystem(user.phoneNumber);

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true };
}
