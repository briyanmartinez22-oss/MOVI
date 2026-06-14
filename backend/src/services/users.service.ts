import type { Prisma, UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJsonField, toAuthUser } from '../utils/normalize';

type RoleAssignmentRow = Prisma.UserRoleAssignmentGetPayload<{ select: { role: true } }>;
type OwnerVehicleRow = Prisma.VehicleGetPayload<{ include: { driver: true } }>;

export async function assignUserRole(userId: string, role: UserRole) {
  return prisma.userRoleAssignment.upsert({
    where: { userId_role: { userId, role } },
    create: { userId, role, isActive: true },
    update: { isActive: true, revokedAt: null },
  });
}

export async function getUserRoles(userId: string): Promise<UserRole[]> {
  const assignments = await prisma.userRoleAssignment.findMany({
    where: { userId, isActive: true },
    select: { role: true },
  });
  const roles = assignments.map((a: RoleAssignmentRow) => a.role);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user && !roles.includes(user.role)) roles.unshift(user.role);
  return [...new Set(roles)];
}

export async function getUserProfiles(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { owner: true, driver: { include: { vehicle: true, subscription: true } }, business: true },
  });
  if (!user) return null;

  const roles = await getUserRoles(userId);

  return {
    user: { ...toAuthUser(user), roles },
    owner: user.owner
      ? {
          ...user.owner,
          documents: parseJsonField(user.owner.documentsJson, {}),
          createdAt: user.owner.createdAt.toISOString(),
        }
      : null,
    driver: user.driver
      ? {
          id: user.driver.id,
          userId: user.driver.userId,
          ownerId: user.driver.ownerId,
          vehicleId: user.driver.vehicleId,
          name: user.driver.name,
          phone: user.driver.phone,
          status: user.driver.status,
          inviteCodeUsed: user.driver.inviteCodeUsed ?? undefined,
          rating: user.driver.rating,
          totalTrips: user.driver.totalTrips,
          createdAt: user.driver.createdAt.toISOString(),
          vehicle: user.driver.vehicle
            ? {
                vehicleId: user.driver.vehicle.id,
                unitId: user.driver.vehicle.unitId,
                ownerId: user.driver.vehicle.ownerId,
                unitNumber: user.driver.vehicle.unitNumber,
                plateNumber: user.driver.vehicle.plateNumber,
                registrationName: user.driver.vehicle.registrationName ?? undefined,
                associationName: user.driver.vehicle.associationName,
                vehicleType: user.driver.vehicle.vehicleType,
                status: user.driver.vehicle.status,
                documents: parseJsonField(user.driver.vehicle.documentsJson, {}),
                driverId: user.driver.id,
                maxLoadKg: user.driver.vehicle.maxLoadKg ?? undefined,
                bedLengthM: user.driver.vehicle.bedLengthM ?? undefined,
                hasCargoCover: user.driver.vehicle.hasCargoCover ?? undefined,
                createdAt: user.driver.vehicle.createdAt.toISOString(),
              }
            : null,
          subscription: user.driver.subscription
            ? {
                id: user.driver.subscription.id,
                driverId: user.driver.subscription.driverId,
                status: user.driver.subscription.status,
                monthlyAmountUsd: user.driver.subscription.monthlyAmountUsd,
                registeredAt: user.driver.subscription.registeredAt.toISOString(),
                trialEndsAt: user.driver.subscription.trialEndsAt.toISOString(),
                nextBillingAt: user.driver.subscription.nextBillingAt.toISOString(),
                paymentMethod: user.driver.subscription.paymentMethod ?? undefined,
                paymentProvider: user.driver.subscription.paymentProvider ?? undefined,
                lastPaidAt: user.driver.subscription.lastPaidAt?.toISOString(),
              }
            : null,
        }
      : null,
    business: user.business
      ? {
          ...user.business,
          createdAt: user.business.createdAt.toISOString(),
        }
      : null,
  };
}

export async function updateUserProfilePhoto(userId: string, profilePhoto: string) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { profilePhoto },
  });
  return toAuthUser(user);
}

export async function listOwnerVehicles(ownerUserId: string) {
  const owner = await prisma.owner.findUnique({ where: { userId: ownerUserId } });
  if (!owner) return [];

  const vehicles = await prisma.vehicle.findMany({
    where: { ownerId: owner.id },
    include: { driver: true },
    orderBy: { createdAt: 'desc' },
  });

  return vehicles.map((v: OwnerVehicleRow) => ({
    vehicleId: v.id,
    unitId: v.unitId,
    ownerId: v.ownerId,
    unitNumber: v.unitNumber,
    plateNumber: v.plateNumber,
    registrationName: v.registrationName ?? undefined,
    associationName: v.associationName,
    vehicleType: v.vehicleType,
    status: v.status,
    documents: parseJsonField(v.documentsJson, {}),
    driverId: v.driver?.id,
    maxLoadKg: v.maxLoadKg ?? undefined,
    bedLengthM: v.bedLengthM ?? undefined,
    hasCargoCover: v.hasCargoCover ?? undefined,
    createdAt: v.createdAt.toISOString(),
    driver: v.driver
      ? { id: v.driver.id, name: v.driver.name, phone: v.driver.phone, status: v.driver.status }
      : null,
  }));
}
