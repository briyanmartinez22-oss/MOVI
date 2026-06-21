import type { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { revokeAllRefreshTokensForUser } from '../lib/refreshToken';
import { normalizePhone } from '../utils/phone';
import { mapDriverMvpStatus, mapOwnerMvpStatus } from '../utils/verification-status';
import { writeAdminAudit } from './audit.service';

type AdminContext = {
  adminUserId: string;
  actorRole?: string | null;
};

async function audit(
  ctx: AdminContext,
  input: {
    action: AuditAction;
    entityType: string;
    entityId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }
) {
  await writeAdminAudit({
    userId: ctx.adminUserId,
    actorRole: ctx.actorRole ?? undefined,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before,
    after: input.after,
  });
}

async function passengerTripStats(userId: string) {
  const [totalTrips, completedTrips] = await Promise.all([
    prisma.trip.count({ where: { passengerId: userId } }),
    prisma.trip.count({
      where: { passengerId: userId, lifecycleStatus: 'trip_completed' },
    }),
  ]);
  return { totalTrips, completedTrips };
}

function serializePassenger(user: {
  id: string;
  fullName: string;
  phoneNumber: string;
  duiNumber: string | null;
  phoneVerified: boolean;
  accountStatus: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    fullName: user.fullName,
    phoneNumber: user.phoneNumber,
    duiNumber: user.duiNumber,
    phoneVerified: user.phoneVerified,
    accountStatus: user.accountStatus,
    mvpStatus: user.accountStatus === 'suspended' ? 'SUSPENDED' : 'VERIFIED',
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getAdminPassengerDetail(userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'passenger' },
  });
  if (!user) return { ok: false as const, error: 'Pasajero no encontrado' };

  const stats = await passengerTripStats(userId);
  const recentTrips = await prisma.trip.findMany({
    where: { passengerId: userId },
    orderBy: { createdAt: 'desc' },
    take: 10,
    select: {
      id: true,
      lifecycleStatus: true,
      passengerName: true,
      createdAt: true,
      passengerOfferPrice: true,
      distanceKm: true,
    },
  });

  return {
    ok: true as const,
    data: {
      ...serializePassenger(user),
      ...stats,
      recentTrips: recentTrips.map((t) => ({
        id: t.id,
        status: t.lifecycleStatus,
        createdAt: t.createdAt.toISOString(),
        passengerOfferPrice: t.passengerOfferPrice,
        distanceKm: t.distanceKm,
      })),
    },
  };
}

export async function updateAdminPassenger(
  userId: string,
  body: { fullName?: string; duiNumber?: string | null; phoneNumber?: string },
  ctx: AdminContext
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'passenger' },
  });
  if (!user) return { ok: false as const, error: 'Pasajero no encontrado' };

  const data: {
    fullName?: string;
    duiNumber?: string | null;
    phoneNumber?: string;
  } = {};

  if (body.fullName?.trim()) data.fullName = body.fullName.trim();
  if (body.duiNumber !== undefined) data.duiNumber = body.duiNumber?.trim() || null;
  if (body.phoneNumber?.trim()) {
    const phoneNumber = normalizePhone(body.phoneNumber.trim());
    const existing = await prisma.user.findFirst({
      where: { phoneNumber, NOT: { id: userId } },
    });
    if (existing) return { ok: false as const, error: 'El teléfono ya está registrado' };
    data.phoneNumber = phoneNumber;
  }

  if (!Object.keys(data).length) {
    return { ok: false as const, error: 'Sin cambios para aplicar' };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
  });

  await audit(ctx, {
    action: 'update',
    entityType: 'passenger',
    entityId: userId,
    before: serializePassenger(user),
    after: serializePassenger(updated),
  });

  const stats = await passengerTripStats(userId);
  return { ok: true as const, data: { ...serializePassenger(updated), ...stats } };
}

export async function suspendAdminPassenger(userId: string, ctx: AdminContext) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'passenger' },
  });
  if (!user) return { ok: false as const, error: 'Pasajero no encontrado' };
  if (user.accountStatus === 'suspended') {
    return { ok: false as const, error: 'El pasajero ya está suspendido' };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'suspended' },
  });
  await revokeAllRefreshTokensForUser(userId);

  await audit(ctx, {
    action: 'suspend',
    entityType: 'passenger',
    entityId: userId,
    before: { accountStatus: user.accountStatus },
    after: { accountStatus: 'suspended' },
  });

  const stats = await passengerTripStats(userId);
  return { ok: true as const, data: { ...serializePassenger(updated), ...stats } };
}

export async function reactivateAdminPassenger(userId: string, ctx: AdminContext) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'passenger' },
  });
  if (!user) return { ok: false as const, error: 'Pasajero no encontrado' };
  if (user.accountStatus === 'active') {
    return { ok: false as const, error: 'El pasajero ya está activo' };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { accountStatus: 'active' },
  });

  await audit(ctx, {
    action: 'unsuspend',
    entityType: 'passenger',
    entityId: userId,
    before: { accountStatus: user.accountStatus },
    after: { accountStatus: 'active' },
  });

  const stats = await passengerTripStats(userId);
  return { ok: true as const, data: { ...serializePassenger(updated), ...stats } };
}

export async function deleteAdminPassenger(userId: string, ctx: AdminContext) {
  const user = await prisma.user.findFirst({
    where: { id: userId, role: 'passenger' },
  });
  if (!user) return { ok: false as const, error: 'Pasajero no encontrado' };

  await audit(ctx, {
    action: 'delete',
    entityType: 'passenger',
    entityId: userId,
    before: serializePassenger(user),
  });

  await prisma.user.delete({ where: { id: userId } });
  return { ok: true as const, data: { deleted: true, id: userId } };
}

function serializeDriver(driver: {
  id: string;
  userId: string;
  name: string;
  phone: string;
  status: string;
  rating: number;
  totalTrips: number;
  createdAt: Date;
}) {
  return {
    id: driver.id,
    userId: driver.userId,
    name: driver.name,
    phone: driver.phone,
    status: driver.status,
    mvpStatus: mapDriverMvpStatus(driver.status as never),
    rating: driver.rating,
    totalTrips: driver.totalTrips,
    createdAt: driver.createdAt.toISOString(),
  };
}

export async function approveAdminDriver(driverId: string, ctx: AdminContext) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { ok: false as const, error: 'Conductor no encontrado' };

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: { status: 'approved' },
  });

  await audit(ctx, {
    action: 'approve',
    entityType: 'driver',
    entityId: driverId,
    before: { status: driver.status },
    after: { status: 'approved' },
  });

  return { ok: true as const, data: serializeDriver(updated) };
}

export async function rejectAdminDriver(driverId: string, ctx: AdminContext) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { ok: false as const, error: 'Conductor no encontrado' };

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: { status: 'rejected' },
  });

  await audit(ctx, {
    action: 'reject',
    entityType: 'driver',
    entityId: driverId,
    before: { status: driver.status },
    after: { status: 'rejected' },
  });

  return { ok: true as const, data: serializeDriver(updated) };
}

export async function suspendAdminDriver(driverId: string, ctx: AdminContext) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { ok: false as const, error: 'Conductor no encontrado' };

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: { status: 'suspended' },
  });

  const active = await prisma.driverSession.findFirst({
    where: { driverId, disconnectedAt: null },
  });
  if (active) {
    await prisma.driverSession.update({
      where: { sessionId: active.sessionId },
      data: { disconnectedAt: new Date() },
    });
  }
  await revokeAllRefreshTokensForUser(driver.userId);

  await audit(ctx, {
    action: 'suspend',
    entityType: 'driver',
    entityId: driverId,
    before: { status: driver.status },
    after: { status: 'suspended' },
  });

  return { ok: true as const, data: serializeDriver(updated) };
}

export async function reactivateAdminDriver(driverId: string, ctx: AdminContext) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { ok: false as const, error: 'Conductor no encontrado' };
  if (driver.status !== 'suspended') {
    return { ok: false as const, error: 'Solo se puede reactivar un conductor suspendido' };
  }

  const updated = await prisma.driver.update({
    where: { id: driverId },
    data: { status: 'approved' },
  });

  await audit(ctx, {
    action: 'unsuspend',
    entityType: 'driver',
    entityId: driverId,
    before: { status: driver.status },
    after: { status: 'approved' },
  });

  return { ok: true as const, data: serializeDriver(updated) };
}

export async function deleteAdminDriver(driverId: string, ctx: AdminContext) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) return { ok: false as const, error: 'Conductor no encontrado' };

  await audit(ctx, {
    action: 'delete',
    entityType: 'driver',
    entityId: driverId,
    before: serializeDriver(driver),
  });

  await revokeAllRefreshTokensForUser(driver.userId);
  await prisma.user.delete({ where: { id: driver.userId } });
  return { ok: true as const, data: { deleted: true, id: driverId } };
}

function serializeOwner(owner: {
  id: string;
  userId: string;
  name: string;
  phone: string;
  dui: string;
  status: string;
  createdAt: Date;
}) {
  return {
    id: owner.id,
    userId: owner.userId,
    name: owner.name,
    phone: owner.phone,
    dui: owner.dui,
    status: owner.status,
    mvpStatus: mapOwnerMvpStatus(owner.status as never),
    createdAt: owner.createdAt.toISOString(),
  };
}

export async function approveAdminOwner(ownerId: string, ctx: AdminContext) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Propietario no encontrado' };

  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: { status: 'approved' },
  });

  await audit(ctx, {
    action: 'approve',
    entityType: 'owner',
    entityId: ownerId,
    before: { status: owner.status },
    after: { status: 'approved' },
  });

  return { ok: true as const, data: serializeOwner(updated) };
}

export async function rejectAdminOwner(ownerId: string, ctx: AdminContext) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Propietario no encontrado' };

  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: { status: 'rejected' },
  });

  await audit(ctx, {
    action: 'reject',
    entityType: 'owner',
    entityId: ownerId,
    before: { status: owner.status },
    after: { status: 'rejected' },
  });

  return { ok: true as const, data: serializeOwner(updated) };
}

export async function suspendAdminOwner(ownerId: string, ctx: AdminContext) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Propietario no encontrado' };

  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: { status: 'suspended' },
  });
  await revokeAllRefreshTokensForUser(owner.userId);

  await audit(ctx, {
    action: 'suspend',
    entityType: 'owner',
    entityId: ownerId,
    before: { status: owner.status },
    after: { status: 'suspended' },
  });

  return { ok: true as const, data: serializeOwner(updated) };
}

export async function reactivateAdminOwner(ownerId: string, ctx: AdminContext) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Propietario no encontrado' };
  if (owner.status !== 'suspended') {
    return { ok: false as const, error: 'Solo se puede reactivar un propietario suspendido' };
  }

  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: { status: 'approved' },
  });

  await audit(ctx, {
    action: 'unsuspend',
    entityType: 'owner',
    entityId: ownerId,
    before: { status: owner.status },
    after: { status: 'approved' },
  });

  return { ok: true as const, data: serializeOwner(updated) };
}

export async function deleteAdminOwner(ownerId: string, ctx: AdminContext) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Propietario no encontrado' };

  await audit(ctx, {
    action: 'delete',
    entityType: 'owner',
    entityId: ownerId,
    before: serializeOwner(owner),
  });

  await revokeAllRefreshTokensForUser(owner.userId);
  await prisma.user.delete({ where: { id: owner.userId } });
  return { ok: true as const, data: { deleted: true, id: ownerId } };
}

function serializeBusiness(business: {
  id: string;
  userId: string;
  businessName: string;
  businessPhone: string;
  businessType: string;
  status: string;
  rating: number;
  totalDeliveries: number;
  createdAt: Date;
}) {
  return {
    id: business.id,
    userId: business.userId,
    businessName: business.businessName,
    businessPhone: business.businessPhone,
    businessType: business.businessType,
    status: business.status,
    mvpStatus:
      business.status === 'approved'
        ? 'VERIFIED'
        : business.status === 'suspended'
          ? 'SUSPENDED'
          : business.status === 'rejected'
            ? 'REJECTED'
            : 'PENDING',
    rating: business.rating,
    totalDeliveries: business.totalDeliveries,
    createdAt: business.createdAt.toISOString(),
  };
}

export async function approveAdminBusiness(businessId: string, ctx: AdminContext) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { ok: false as const, error: 'Comercio no encontrado' };

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { status: 'approved' },
  });

  await audit(ctx, {
    action: 'approve',
    entityType: 'business',
    entityId: businessId,
    before: { status: business.status },
    after: { status: 'approved' },
  });

  return { ok: true as const, data: serializeBusiness(updated) };
}

export async function rejectAdminBusiness(businessId: string, ctx: AdminContext) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { ok: false as const, error: 'Comercio no encontrado' };

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { status: 'rejected' },
  });

  await audit(ctx, {
    action: 'reject',
    entityType: 'business',
    entityId: businessId,
    before: { status: business.status },
    after: { status: 'rejected' },
  });

  return { ok: true as const, data: serializeBusiness(updated) };
}

export async function suspendAdminBusiness(businessId: string, ctx: AdminContext) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { ok: false as const, error: 'Comercio no encontrado' };

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { status: 'suspended' },
  });
  await revokeAllRefreshTokensForUser(business.userId);

  await audit(ctx, {
    action: 'suspend',
    entityType: 'business',
    entityId: businessId,
    before: { status: business.status },
    after: { status: 'suspended' },
  });

  return { ok: true as const, data: serializeBusiness(updated) };
}

export async function reactivateAdminBusiness(businessId: string, ctx: AdminContext) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { ok: false as const, error: 'Comercio no encontrado' };
  if (business.status !== 'suspended') {
    return { ok: false as const, error: 'Solo se puede reactivar un comercio suspendido' };
  }

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: { status: 'approved' },
  });

  await audit(ctx, {
    action: 'unsuspend',
    entityType: 'business',
    entityId: businessId,
    before: { status: business.status },
    after: { status: 'approved' },
  });

  return { ok: true as const, data: serializeBusiness(updated) };
}

export async function deleteAdminBusiness(businessId: string, ctx: AdminContext) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return { ok: false as const, error: 'Comercio no encontrado' };

  await audit(ctx, {
    action: 'delete',
    entityType: 'business',
    entityId: businessId,
    before: serializeBusiness(business),
  });

  await revokeAllRefreshTokensForUser(business.userId);
  await prisma.user.delete({ where: { id: business.userId } });
  return { ok: true as const, data: { deleted: true, id: businessId } };
}
