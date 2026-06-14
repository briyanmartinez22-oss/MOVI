import type { UserRole } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { issueRefreshToken } from '../lib/refreshToken';
import { signAuthToken } from '../lib/jwt';
import {
  duiMatches,
  generateDriverPublicId,
  generateInviteCode,
  generateUnitId,
  namesMatch,
  normalizeDui,
  normalizePhone,
  parseJsonField,
  stringifyJsonField,
  toAuthUser,
} from '../utils/normalize';
import { assertOtpValidForLogin } from './otpService';
import { canDriverOperate } from './subscription.service';
import { assignUserRole } from './users.service';

async function issueAuthBundle(userId: string, role: string) {
  const authToken = signAuthToken({ userId, role });
  const refresh = await issueRefreshToken(userId);
  return { authToken, refreshToken: refresh.refreshToken };
}

function getFirstBillingDate(registeredAt: Date): Date {
  return new Date(registeredAt.getFullYear(), registeredAt.getMonth() + 1, 1);
}

async function createDriverSubscription(driverId: string, registeredAt = new Date()) {
  const trialEnds = getFirstBillingDate(registeredAt);
  return prisma.driverSubscription.create({
    data: {
      driverId,
      trialEndsAt: trialEnds,
      nextBillingAt: trialEnds,
    },
  });
}

export async function loginWithOtp(phone: string, dui: string, code: string) {
  const verify = await assertOtpValidForLogin(phone, code);
  if (!verify.ok) return verify;

  const phoneNumber = normalizePhone(phone);
  const user = await prisma.user.findUnique({ where: { phoneNumber } });

  if (!user) {
    return { ok: false as const, error: 'Usuario no registrado. Completa el registro.' };
  }

  if (!duiMatches(user.duiNumber, dui)) {
    const other = await prisma.user.findFirst({
      where: { phoneNumber, NOT: { id: user.id } },
    });
    if (other) {
      return { ok: false as const, error: 'El DUI no coincide con el registrado.' };
    }
    return { ok: false as const, error: 'El DUI no coincide con el registrado.' };
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerified: true },
  });

  const authUser = toAuthUser(updated);
  const tokens = await issueAuthBundle(updated.id, updated.role);
  return { ok: true as const, user: authUser, ...tokens };
}

export async function registerPassenger(phone: string, dui: string, fullName: string) {
  const phoneNumber = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      duiNumber: normalizeDui(dui),
      role: 'passenger',
      phoneVerified: true,
    },
  });

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'passenger');
  const tokens = await issueAuthBundle(user.id, user.role);
  return { ok: true as const, user: authUser, ...tokens };
}

export async function registerOwner(phone: string, fullName: string, dui: string) {
  const phoneNumber = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      duiNumber: normalizeDui(dui),
      role: 'owner',
      phoneVerified: true,
      owner: {
        create: {
          name: fullName,
          phone: phoneNumber,
          dui: normalizeDui(dui),
        },
      },
    },
    include: { owner: true },
  });

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'owner');
  const tokens = await issueAuthBundle(user.id, user.role);
  return {
    ok: true as const,
    user: authUser,
    owner: {
      ...user.owner!,
      documents: parseJsonField(user.owner!.documentsJson, {}),
      createdAt: user.owner!.createdAt.toISOString(),
    },
    ...tokens,
  };
}

export async function registerBusiness(
  phone: string,
  fullName: string,
  dui: string,
  data: {
    businessName: string;
    businessType: string;
    businessPhone: string;
    nit?: string;
    latitude: number;
    longitude: number;
    addressLabel: string;
  }
) {
  const phoneNumber = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      duiNumber: normalizeDui(dui),
      role: 'business',
      phoneVerified: true,
      business: {
        create: {
          businessName: data.businessName,
          businessType: data.businessType as never,
          responsibleDui: normalizeDui(dui),
          businessPhone: normalizePhone(data.businessPhone),
          nit: data.nit,
          latitude: data.latitude,
          longitude: data.longitude,
          addressLabel: data.addressLabel,
          status: 'approved',
        },
      },
    },
    include: { business: true },
  });

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'business');
  const tokens = await issueAuthBundle(user.id, user.role);
  const business = user.business!;
  return {
    ok: true as const,
    user: authUser,
    business: {
      id: business.id,
      userId: business.userId,
      businessName: business.businessName,
      businessType: business.businessType,
      responsibleDui: business.responsibleDui,
      businessPhone: business.businessPhone,
      nit: business.nit ?? undefined,
      coordinates: { latitude: business.latitude, longitude: business.longitude },
      addressLabel: business.addressLabel,
      status: business.status,
      rating: business.rating,
      totalDeliveries: business.totalDeliveries,
      createdAt: business.createdAt.toISOString(),
    },
    ...tokens,
  };
}

export async function checkPlate(plate: string) {
  const normalized = plate.toUpperCase().trim();
  const existing = await prisma.vehicle.findUnique({ where: { plateNumber: normalized } });
  if (existing) {
    return {
      ok: true as const,
      data: {
        available: false,
        message: 'Esta unidad ya está registrada por otro dueño.',
        existingOwnerId: existing.ownerId,
      },
    };
  }
  return { ok: true as const, data: { available: true } };
}

export async function registerVehicle(
  ownerId: string,
  data: {
    unitNumber: string;
    plateNumber: string;
    associationName: string;
    vehicleType?: string;
    registrationName?: string;
    maxLoadKg?: number;
    bedLengthM?: number;
    hasCargoCover?: boolean;
  }
) {
  const plateCheck = await checkPlate(data.plateNumber);
  if (!plateCheck.data?.available) {
    return { ok: false as const, error: plateCheck.data?.message ?? 'Placa no disponible' };
  }

  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Dueño no encontrado' };

  const count = await prisma.vehicle.count();
  const unitId = generateUnitId(count);

  const vehicle = await prisma.vehicle.create({
    data: {
      unitId,
      ownerId,
      unitNumber: data.unitNumber,
      plateNumber: data.plateNumber.toUpperCase(),
      registrationName: data.registrationName,
      associationName: data.associationName,
      vehicleType: (data.vehicleType ?? 'mototaxi') as never,
      maxLoadKg: data.maxLoadKg,
      bedLengthM: data.bedLengthM,
      hasCargoCover: data.hasCargoCover,
    },
  });

  return {
    ok: true as const,
    vehicle: {
      vehicleId: vehicle.id,
      unitId: vehicle.unitId,
      ownerId: vehicle.ownerId,
      unitNumber: vehicle.unitNumber,
      plateNumber: vehicle.plateNumber,
      registrationName: vehicle.registrationName ?? undefined,
      associationName: vehicle.associationName,
      vehicleType: vehicle.vehicleType,
      status: vehicle.status,
      documents: parseJsonField(vehicle.documentsJson, {}),
      maxLoadKg: vehicle.maxLoadKg ?? undefined,
      bedLengthM: vehicle.bedLengthM ?? undefined,
      hasCargoCover: vehicle.hasCargoCover ?? undefined,
      createdAt: vehicle.createdAt.toISOString(),
    },
  };
}

export async function inviteDriver(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };
  if (vehicle.status !== 'approved') {
    return { ok: false as const, error: 'La unidad debe estar aprobada.' };
  }

  const code = generateInviteCode();
  const invite = await prisma.inviteCode.create({
    data: { code, vehicleId, ownerId: vehicle.ownerId },
  });

  return {
    ok: true as const,
    invite: {
      code: invite.code,
      vehicleId: invite.vehicleId,
      ownerId: invite.ownerId,
      createdAt: invite.createdAt.toISOString(),
    },
  };
}

export async function registerDriverWithInvite(
  phone: string,
  dui: string,
  fullName: string,
  code: string
) {
  const phoneNumber = normalizePhone(phone);
  const existing = await prisma.user.findUnique({ where: { phoneNumber } });
  if (existing) return { ok: false as const, error: 'Este teléfono ya está registrado.' };

  const invite = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
    include: { vehicle: true, owner: true },
  });
  if (!invite) return { ok: false as const, error: 'Código de invitación inválido.' };
  if (invite.usedBy) return { ok: false as const, error: 'Este código ya fue utilizado.' };
  if (invite.owner.status !== 'approved') {
    return { ok: false as const, error: 'El dueño no está aprobado.' };
  }
  if (invite.vehicle.status !== 'approved') {
    return { ok: false as const, error: 'La unidad no está aprobada.' };
  }

  const activeDriver = await prisma.driver.findFirst({
    where: { vehicleId: invite.vehicleId, status: 'approved' },
  });
  if (activeDriver) {
    return { ok: false as const, error: 'Esta unidad ya tiene un conductor activo.' };
  }

  const driverCount = await prisma.driver.count();
  const driverPublicId = generateDriverPublicId(driverCount);

  const user = await prisma.user.create({
    data: {
      fullName,
      phoneNumber,
      duiNumber: normalizeDui(dui),
      role: 'driver',
      phoneVerified: true,
      driver: {
        create: {
          id: driverPublicId,
          ownerId: invite.ownerId,
          vehicleId: invite.vehicleId,
          name: fullName,
          phone: phoneNumber,
          status: 'approved',
          inviteCodeUsed: code.toUpperCase(),
        },
      },
    },
    include: { driver: true },
  });

  await createDriverSubscription(user.driver!.id);
  await prisma.inviteCode.update({
    where: { code: code.toUpperCase() },
    data: { usedBy: user.driver!.id, usedAt: new Date() },
  });

  const authUser = toAuthUser(user);
  await assignUserRole(user.id, 'driver');
  const tokens = await issueAuthBundle(user.id, user.role);
  const driver = user.driver!;

  return {
    ok: true as const,
    user: authUser,
    driver: {
      id: driver.id,
      userId: driver.userId,
      ownerId: driver.ownerId,
      vehicleId: driver.vehicleId,
      name: driver.name,
      phone: driver.phone,
      status: driver.status,
      inviteCodeUsed: driver.inviteCodeUsed ?? undefined,
      rating: driver.rating,
      totalTrips: driver.totalTrips,
      createdAt: driver.createdAt.toISOString(),
    },
    ...tokens,
  };
}

export async function uploadOwnerDocuments(ownerId: string, docs: Record<string, unknown>) {
  const owner = await prisma.owner.findUnique({ where: { id: ownerId } });
  if (!owner) return { ok: false as const, error: 'Dueño no encontrado' };

  const merged = { ...parseJsonField(owner.documentsJson, {}), ...docs };
  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: {
      documentsJson: stringifyJsonField(merged),
      status: docs.selfie ? 'under_review' : 'documents_uploaded',
    },
  });

  return {
    ok: true as const,
    owner: {
      ...updated,
      documents: merged,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function submitOwnerVerification(
  ownerId: string,
  specialCase?: string,
  ownershipProofImage?: string
) {
  const updated = await prisma.owner.update({
    where: { id: ownerId },
    data: { status: 'under_review', specialCase, ownershipProofImage },
  }).catch(() => null);

  if (!updated) return { ok: false as const, error: 'Dueño no encontrado' };
  return {
    ok: true as const,
    owner: {
      ...updated,
      documents: parseJsonField(updated.documentsJson, {}),
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function uploadVehicleDocuments(
  vehicleId: string,
  docs: Record<string, unknown> & { registrationName?: string }
) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };

  const merged = { ...parseJsonField(vehicle.documentsJson, {}), ...docs };
  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      documentsJson: stringifyJsonField(merged),
      registrationName: docs.registrationName ?? vehicle.registrationName,
      status: 'documents_uploaded',
    },
  });

  return {
    ok: true as const,
    vehicle: {
      vehicleId: updated.id,
      unitId: updated.unitId,
      ownerId: updated.ownerId,
      unitNumber: updated.unitNumber,
      plateNumber: updated.plateNumber,
      registrationName: updated.registrationName ?? undefined,
      associationName: updated.associationName,
      vehicleType: updated.vehicleType,
      status: updated.status,
      documents: merged,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function submitVehicleVerification(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: true },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };

  const regName = vehicle.registrationName ?? '';
  if (regName && !namesMatch(vehicle.owner.name, regName)) {
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status: 'rejected' },
    });
    return {
      ok: false as const,
      error: 'Nombre en tarjeta de circulación no coincide con el DUI. Unidad rechazada.',
    };
  }

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: 'under_review' },
  });

  return {
    ok: true as const,
    vehicle: {
      vehicleId: updated.id,
      unitId: updated.unitId,
      ownerId: updated.ownerId,
      unitNumber: updated.unitNumber,
      plateNumber: updated.plateNumber,
      registrationName: updated.registrationName ?? undefined,
      associationName: updated.associationName,
      vehicleType: updated.vehicleType,
      status: updated.status,
      documents: parseJsonField(updated.documentsJson, {}),
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function startDriverSession(driverId: string, vehicleId: string) {
  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { owner: true },
  });

  if (!driver || driver.status !== 'approved') {
    return { ok: false as const, error: 'Conductor no aprobado.' };
  }
  if (!vehicle || vehicle.status !== 'approved') {
    return { ok: false as const, error: 'Unidad no aprobada.' };
  }
  if (!vehicle.owner || vehicle.owner.status !== 'approved') {
    return { ok: false as const, error: 'Dueño no aprobado.' };
  }
  if (!driver.inviteCodeUsed) {
    return { ok: false as const, error: 'Conductor no invitado.' };
  }

  const subCheck = await canDriverOperate(driverId);
  if (!subCheck.ok) {
    return { ok: false as const, error: subCheck.reason ?? 'Suscripción vencida.' };
  }

  const active = await prisma.driverSession.findFirst({
    where: { driverId, disconnectedAt: null },
  });
  if (active) {
    return {
      ok: true as const,
      session: {
        sessionId: active.sessionId,
        driverId: active.driverId,
        vehicleId: active.vehicleId,
        connectedAt: active.connectedAt.toISOString(),
        disconnectedAt: active.disconnectedAt?.toISOString() ?? null,
        durationMinutes: active.durationMinutes,
        totalTrips: active.totalTrips,
        totalKm: active.totalKm,
        totalCashCollected: active.totalCashCollected,
      },
    };
  }

  const session = await prisma.driverSession.create({
    data: { driverId, vehicleId },
  });

  return {
    ok: true as const,
    session: {
      sessionId: session.sessionId,
      driverId: session.driverId,
      vehicleId: session.vehicleId,
      connectedAt: session.connectedAt.toISOString(),
      disconnectedAt: null,
      durationMinutes: null,
      totalTrips: session.totalTrips,
      totalKm: session.totalKm,
      totalCashCollected: session.totalCashCollected,
    },
  };
}

export async function endDriverSession(
  driverId: string,
  stats?: { totalTrips?: number; totalKm?: number; totalCashCollected?: number }
) {
  const active = await prisma.driverSession.findFirst({
    where: { driverId, disconnectedAt: null },
    orderBy: { connectedAt: 'desc' },
  });
  if (!active) return { ok: false as const, error: 'No hay sesión activa.' };

  const disconnectedAt = new Date();
  const durationMinutes = Math.round(
    (disconnectedAt.getTime() - active.connectedAt.getTime()) / 60000
  );

  const updated = await prisma.driverSession.update({
    where: { sessionId: active.sessionId },
    data: {
      disconnectedAt,
      durationMinutes,
      totalTrips: stats?.totalTrips ?? active.totalTrips,
      totalKm: stats?.totalKm ?? active.totalKm,
      totalCashCollected: stats?.totalCashCollected ?? active.totalCashCollected,
    },
  });

  return {
    ok: true as const,
    session: {
      sessionId: updated.sessionId,
      driverId: updated.driverId,
      vehicleId: updated.vehicleId,
      connectedAt: updated.connectedAt.toISOString(),
      disconnectedAt: updated.disconnectedAt?.toISOString() ?? null,
      durationMinutes: updated.durationMinutes,
      totalTrips: updated.totalTrips,
      totalKm: updated.totalKm,
      totalCashCollected: updated.totalCashCollected,
    },
  };
}

export async function setAdminApproval(
  entity: 'owner' | 'vehicle' | 'driver',
  id: string,
  action: 'approve' | 'reject'
) {
  const status = action === 'approve' ? 'approved' : 'rejected';

  if (entity === 'owner') {
    const updated = await prisma.owner.update({ where: { id }, data: { status } }).catch(() => null);
    if (!updated) return { ok: false as const, error: 'Dueño no encontrado' };
    return {
      ok: true as const,
      data: { ...updated, documents: parseJsonField(updated.documentsJson, {}), createdAt: updated.createdAt.toISOString() },
    };
  }

  if (entity === 'vehicle') {
    const updated = await prisma.vehicle.update({ where: { id }, data: { status } }).catch(() => null);
    if (!updated) return { ok: false as const, error: 'Vehículo no encontrado' };
    return {
      ok: true as const,
      data: {
        vehicleId: updated.id,
        unitId: updated.unitId,
        ownerId: updated.ownerId,
        unitNumber: updated.unitNumber,
        plateNumber: updated.plateNumber,
        registrationName: updated.registrationName ?? undefined,
        associationName: updated.associationName,
        vehicleType: updated.vehicleType,
        status: updated.status,
        documents: parseJsonField(updated.documentsJson, {}),
        createdAt: updated.createdAt.toISOString(),
      },
    };
  }

  const updated = await prisma.driver.update({ where: { id }, data: { status } }).catch(() => null);
  if (!updated) return { ok: false as const, error: 'Conductor no encontrado' };
  return {
    ok: true as const,
    data: {
      id: updated.id,
      userId: updated.userId,
      ownerId: updated.ownerId,
      vehicleId: updated.vehicleId,
      name: updated.name,
      phone: updated.phone,
      status: updated.status,
      inviteCodeUsed: updated.inviteCodeUsed ?? undefined,
      rating: updated.rating,
      totalTrips: updated.totalTrips,
      createdAt: updated.createdAt.toISOString(),
    },
  };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { owner: true, driver: true, business: true },
  });
  if (!user) return null;
  return toAuthUser(user);
}

export async function updateUserProfilePhoto(userId: string, profilePhoto: string) {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { profilePhoto },
  });
  return toAuthUser(updated);
}

export async function getInvitePreview(code: string) {
  const invite = await prisma.inviteCode.findUnique({
    where: { code: code.toUpperCase() },
    include: { vehicle: true, owner: true },
  });
  if (!invite || invite.usedBy) return null;

  return {
    code: {
      code: invite.code,
      vehicleId: invite.vehicleId,
      ownerId: invite.ownerId,
      createdAt: invite.createdAt.toISOString(),
      usedBy: invite.usedBy ?? undefined,
      usedAt: invite.usedAt?.toISOString(),
    },
    vehicle: {
      vehicleId: invite.vehicle.id,
      unitId: invite.vehicle.unitId,
      ownerId: invite.vehicle.ownerId,
      unitNumber: invite.vehicle.unitNumber,
      plateNumber: invite.vehicle.plateNumber,
      registrationName: invite.vehicle.registrationName ?? undefined,
      associationName: invite.vehicle.associationName,
      vehicleType: invite.vehicle.vehicleType,
      status: invite.vehicle.status,
      documents: parseJsonField(invite.vehicle.documentsJson, {}),
      createdAt: invite.vehicle.createdAt.toISOString(),
    },
    owner: {
      ...invite.owner,
      documents: parseJsonField(invite.owner.documentsJson, {}),
      createdAt: invite.owner.createdAt.toISOString(),
    },
  };
}

export async function getDriverSessionsList(driverId: string) {
  const sessions = await prisma.driverSession.findMany({
    where: { driverId },
    orderBy: { connectedAt: 'desc' },
  });

  return sessions.map((session) => ({
    sessionId: session.sessionId,
    driverId: session.driverId,
    vehicleId: session.vehicleId,
    connectedAt: session.connectedAt.toISOString(),
    disconnectedAt: session.disconnectedAt?.toISOString() ?? null,
    durationMinutes: session.durationMinutes,
    totalTrips: session.totalTrips,
    totalKm: session.totalKm,
    totalCashCollected: session.totalCashCollected,
  }));
}

export function getDemandZonesSeed() {
  return [
    {
      id: 'zone-1',
      latitude: 13.6929,
      longitude: -89.2182,
      intensity: 'high' as const,
      label: 'Centro San Salvador',
      serviceCategory: 'viaje' as const,
      vehicleType: 'mototaxi' as const,
    },
    {
      id: 'zone-2',
      latitude: 13.701,
      longitude: -89.224,
      intensity: 'medium' as const,
      label: 'Colonia Escalón',
      serviceCategory: 'entrega' as const,
    },
    {
      id: 'zone-3',
      latitude: 13.68,
      longitude: -89.21,
      intensity: 'low' as const,
      label: 'Mercado Central',
      serviceCategory: 'carga' as const,
      vehicleType: 'pickup' as const,
    },
  ];
}

export type { UserRole };
