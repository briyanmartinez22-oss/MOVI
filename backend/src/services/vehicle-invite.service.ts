import type { VehicleInviteStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { writeAdminAudit } from './audit.service';
import { inviteFailure, type VehicleInviteErrorCode } from './vehicle-invite.errors';

const INVITE_TTL_DAYS = 7;
const CODE_PREFIXES = ['MV', 'VH'] as const;

function randomSegment(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export function generateVehicleInviteCode(): string {
  const prefix = CODE_PREFIXES[Math.floor(Math.random() * CODE_PREFIXES.length)];
  return `${prefix}-${randomSegment(6)}`;
}

export async function uniqueVehicleInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = generateVehicleInviteCode();
    const exists = await prisma.vehicleInvite.findUnique({ where: { inviteCode: code } });
    if (!exists) return code;
  }
  return `${CODE_PREFIXES[0]}-${randomSegment(8)}`;
}

function expiresDefault(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + INVITE_TTL_DAYS);
  return d;
}

export function maskPlate(plate: string): string {
  if (plate.length <= 3) return plate;
  return `${plate.slice(0, 2)}***${plate.slice(-1)}`;
}

export async function expireStaleInvites() {
  await prisma.vehicleInvite.updateMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });
}

export type ValidatedInvite = Awaited<ReturnType<typeof validateVehicleInvite>>;

export async function validateVehicleInvite(code: string) {
  await expireStaleInvites();
  const normalized = code.trim().toUpperCase();
  const invite = await prisma.vehicleInvite.findUnique({
    where: { inviteCode: normalized },
    include: {
      vehicle: { include: { owner: true } },
      owner: true,
    },
  });

  if (!invite) {
    return inviteFailure('INVITE_INVALID');
  }

  if (invite.status === 'REVOKED') {
    return inviteFailure('INVITE_INVALID', 'Este código fue revocado.');
  }

  if (invite.status === 'USED' || invite.currentUses >= invite.maxUses) {
    return inviteFailure('INVITE_USED');
  }

  if (invite.status === 'EXPIRED' || invite.expiresAt < new Date()) {
    if (invite.status === 'ACTIVE') {
      await prisma.vehicleInvite.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
    }
    return inviteFailure('INVITE_EXPIRED');
  }

  if (invite.status !== 'ACTIVE') {
    return inviteFailure('INVITE_INVALID');
  }

  const vehicle = invite.vehicle;
  const owner = invite.owner;

  if (!vehicle || vehicle.deletedAt) {
    return inviteFailure('VEHICLE_DISABLED', 'Vehículo no encontrado.');
  }

  if (vehicle.status === 'suspended' || vehicle.status === 'rejected' || vehicle.status === 'deleted') {
    return inviteFailure('VEHICLE_DISABLED');
  }

  if (vehicle.status !== 'approved') {
    return inviteFailure('VEHICLE_DISABLED', 'La unidad no está aprobada.');
  }

  if (!owner || owner.deletedAt) {
    return inviteFailure('INVITE_INVALID', 'Dueño no encontrado.');
  }

  if (owner.status === 'suspended') {
    return inviteFailure('OWNER_SUSPENDED');
  }

  if (owner.status !== 'approved') {
    return inviteFailure('INVITE_INVALID', 'El dueño no está aprobado.');
  }

  const activeDriver = await prisma.driver.findFirst({
    where: {
      vehicleId: invite.vehicleId,
      status: { in: ['approved', 'pending'] },
      deletedAt: null,
    },
  });
  if (activeDriver) {
    return inviteFailure('INVITE_INVALID', 'Esta unidad ya tiene conductor asignado.');
  }

  return { ok: true as const, invite, vehicle, owner };
}

async function assertOwnerCanInvite(ownerId: string) {
  const owner = await prisma.owner.findFirst({ where: { id: ownerId, deletedAt: null } });
  if (!owner) return { ok: false as const, error: 'Dueño no encontrado.' };
  if (owner.status === 'suspended') {
    return { ok: false as const, error: 'Dueño suspendido.' };
  }
  if (owner.status !== 'approved') {
    return { ok: false as const, error: 'Solo dueños aprobados pueden generar invitaciones.' };
  }
  return { ok: true as const, owner };
}

async function assertVehicleCanInvite(vehicleId: string, ownerId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, ownerId, deletedAt: null },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado.' };
  if (vehicle.status === 'suspended' || vehicle.status === 'rejected' || vehicle.status === 'deleted') {
    return { ok: false as const, error: 'Vehículo suspendido o no disponible.' };
  }
  if (vehicle.status !== 'approved') {
    return { ok: false as const, error: 'Solo vehículos aprobados pueden generar invitaciones.' };
  }
  return { ok: true as const, vehicle };
}

export async function createVehicleInvite(
  vehicleId: string,
  ownerId: string,
  createdByUserId: string
) {
  const ownerCheck = await assertOwnerCanInvite(ownerId);
  if (!ownerCheck.ok) return ownerCheck;

  const vehicleCheck = await assertVehicleCanInvite(vehicleId, ownerId);
  if (!vehicleCheck.ok) return vehicleCheck;

  const activeDriver = await prisma.driver.findFirst({
    where: {
      vehicleId,
      status: { in: ['approved', 'pending'] },
      deletedAt: null,
    },
  });
  if (activeDriver) {
    return { ok: false as const, error: 'Esta unidad ya tiene conductor asignado.' };
  }

  await prisma.vehicleInvite.updateMany({
    where: { vehicleId, status: 'ACTIVE' },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });

  const createdAt = new Date();
  const inviteCode = await uniqueVehicleInviteCode();
  const invite = await prisma.vehicleInvite.create({
    data: {
      vehicleId,
      ownerId,
      inviteCode,
      expiresAt: expiresDefault(createdAt),
      createdBy: createdByUserId,
    },
  });

  await writeAdminAudit({
    userId: createdByUserId,
    action: 'create',
    entityType: 'vehicle_invite',
    entityId: invite.id,
    after: { code: invite.inviteCode, vehicleId, ownerId },
  });

  return {
    ok: true as const,
    invite: serializeInvite(invite),
  };
}

export async function revokeVehicleInvite(inviteId: string, actorId: string, reason?: string) {
  const invite = await prisma.vehicleInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return { ok: false as const, error: 'Invitación no encontrada.' };
  if (invite.status !== 'ACTIVE') {
    return { ok: false as const, error: 'Solo se pueden revocar invitaciones activas.' };
  }
  const updated = await prisma.vehicleInvite.update({
    where: { id: inviteId },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });
  await writeAdminAudit({
    userId: actorId,
    action: 'revoke',
    entityType: 'vehicle_invite',
    entityId: inviteId,
    after: { status: 'REVOKED', reason },
  });
  return { ok: true as const, invite: serializeInvite(updated) };
}

/** @deprecated Use revokeVehicleInvite */
export const cancelVehicleInvite = revokeVehicleInvite;

export async function extendVehicleInvite(inviteId: string, actorId: string, days = INVITE_TTL_DAYS) {
  const invite = await prisma.vehicleInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return { ok: false as const, error: 'Invitación no encontrada.' };
  if (invite.status === 'USED' || invite.status === 'REVOKED') {
    return { ok: false as const, error: 'No se puede extender esta invitación.' };
  }
  const expiresAt = expiresDefault();
  const updated = await prisma.vehicleInvite.update({
    where: { id: inviteId },
    data: { expiresAt, status: 'ACTIVE' },
  });
  await writeAdminAudit({
    userId: actorId,
    action: 'update',
    entityType: 'vehicle_invite',
    entityId: inviteId,
    after: { expiresAt: expiresAt.toISOString(), status: 'ACTIVE' },
  });
  return { ok: true as const, invite: serializeInvite(updated) };
}

export async function regenerateVehicleInvite(inviteId: string, actorId: string) {
  const invite = await prisma.vehicleInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return { ok: false as const, error: 'Invitación no encontrada.' };
  if (invite.status === 'USED') {
    return { ok: false as const, error: 'No se puede regenerar un código ya usado.' };
  }
  await prisma.vehicleInvite.update({
    where: { id: inviteId },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });
  await writeAdminAudit({
    userId: actorId,
    action: 'regenerate',
    entityType: 'vehicle_invite',
    entityId: inviteId,
    before: { code: invite.inviteCode, status: invite.status },
  });
  return createVehicleInvite(invite.vehicleId, invite.ownerId, actorId);
}

export async function markInviteUsed(inviteId: string, driverId: string) {
  const invite = await prisma.vehicleInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return;

  const nextUses = invite.currentUses + 1;
  const nextStatus: VehicleInviteStatus =
    nextUses >= invite.maxUses ? 'USED' : invite.status;

  await prisma.vehicleInvite.update({
    where: { id: inviteId },
    data: {
      currentUses: nextUses,
      status: nextStatus,
      usedByDriverId: driverId,
    },
  });
}

export async function listVehicleInvitesForOwner(ownerId: string, vehicleId?: string) {
  await expireStaleInvites();
  const rows = await prisma.vehicleInvite.findMany({
    where: {
      ownerId,
      ...(vehicleId ? { vehicleId } : {}),
    },
    include: { vehicle: true },
    orderBy: { createdAt: 'desc' },
  });
  return rows.map((row) => ({
    ...serializeInvite(row),
    vehicle: {
      vehicleId: row.vehicle.id,
      unitNumber: row.vehicle.unitNumber,
      plateNumber: row.vehicle.plateNumber,
      brand: row.vehicle.brand,
      model: row.vehicle.model,
      year: row.vehicle.year,
    },
  }));
}

export async function listAllVehicleInvitesAdmin() {
  await expireStaleInvites();
  const rows = await prisma.vehicleInvite.findMany({
    include: { vehicle: true, owner: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return rows.map((row) => ({
    ...serializeInvite(row),
    vehicle: {
      vehicleId: row.vehicle.id,
      unitNumber: row.vehicle.unitNumber,
      plateNumber: row.vehicle.plateNumber,
      brand: row.vehicle.brand,
      model: row.vehicle.model,
      year: row.vehicle.year,
    },
    owner: { id: row.owner.id, name: row.owner.name },
  }));
}

export function serializeInvite(invite: {
  id: string;
  vehicleId: string;
  ownerId: string;
  inviteCode: string;
  status: VehicleInviteStatus;
  expiresAt: Date;
  maxUses: number;
  currentUses: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  revokedAt: Date | null;
  usedByDriverId: string | null;
}) {
  return {
    id: invite.id,
    vehicleId: invite.vehicleId,
    ownerId: invite.ownerId,
    code: invite.inviteCode,
    inviteCode: invite.inviteCode,
    status: invite.status,
    expiresAt: invite.expiresAt.toISOString(),
    maxUses: invite.maxUses,
    currentUses: invite.currentUses,
    usedCount: invite.currentUses,
    createdBy: invite.createdBy,
    createdAt: invite.createdAt.toISOString(),
    updatedAt: invite.updatedAt.toISOString(),
    revokedAt: invite.revokedAt?.toISOString() ?? null,
    usedByDriverId: invite.usedByDriverId ?? null,
  };
}

export function buildInvitePreview(
  invite: Awaited<ReturnType<typeof validateVehicleInvite>> & { ok: true }
) {
  const { vehicle, owner } = invite;
  return {
    invite: serializeInvite(invite.invite),
    vehicle: {
      vehicleId: vehicle.id,
      unitId: vehicle.unitId,
      unitNumber: vehicle.unitNumber,
      platePartial: maskPlate(vehicle.plateNumber),
      brand: vehicle.brand ?? undefined,
      model: vehicle.model ?? undefined,
      year: vehicle.year ?? undefined,
      vehicleType: vehicle.vehicleType,
      color: vehicle.color ?? undefined,
    },
    owner: {
      id: owner.id,
      name: owner.name,
      firstName: owner.firstName,
      lastName: owner.lastName,
    },
  };
}

export type { VehicleInviteErrorCode };
