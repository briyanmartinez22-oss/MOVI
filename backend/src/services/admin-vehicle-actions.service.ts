import type { AuditAction, VehicleVerificationStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJsonField } from '../utils/normalize';
import { mapVehicleMvpStatus } from '../utils/verification-status';
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

function serializeVehicle(
  v: {
    id: string;
    unitId: string;
    ownerId: string;
    unitNumber: string;
    plateNumber: string;
    registrationName: string | null;
    associationName: string;
    vehicleType: string;
    status: VehicleVerificationStatus;
    documentsJson: string;
    photosJson: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    rejectReason: string | null;
    autoRejected: boolean;
    createdAt: Date;
    owner?: { id: string; name: string; phone: string; dui: string } | null;
    driver?: { id: string; name: string; phone: string; status: string } | null;
  }
) {
  const documents = parseJsonField<Record<string, string>>(v.documentsJson, {});
  const photos = parseJsonField<string[]>(v.photosJson, []);
  return {
    id: v.id,
    vehicleId: v.id,
    unitId: v.unitId,
    ownerId: v.ownerId,
    unitNumber: v.unitNumber,
    plateNumber: v.plateNumber,
    registrationName: v.registrationName ?? undefined,
    associationName: v.associationName,
    vehicleType: v.vehicleType,
    status: v.status,
    mvpStatus: mapVehicleMvpStatus(v.status),
    brand: v.brand ?? undefined,
    model: v.model ?? undefined,
    year: v.year ?? undefined,
    color: v.color ?? undefined,
    rejectReason: v.rejectReason ?? undefined,
    autoRejected: v.autoRejected,
    documents,
    photos,
    owner: v.owner
      ? { id: v.owner.id, name: v.owner.name, phone: v.owner.phone, dui: v.owner.dui }
      : null,
    driver: v.driver
      ? { id: v.driver.id, name: v.driver.name, phone: v.driver.phone, status: v.driver.status }
      : null,
    createdAt: v.createdAt.toISOString(),
  };
}

const vehicleInclude = {
  owner: { select: { id: true, name: true, phone: true, dui: true } },
  driver: { select: { id: true, name: true, phone: true, status: true } },
} as const;

export async function listAdminVehicles() {
  const vehicles = await prisma.vehicle.findMany({
    where: { status: { not: 'deleted' } },
    include: vehicleInclude,
    orderBy: { createdAt: 'desc' },
    take: 300,
  });
  return vehicles.map(serializeVehicle);
}

export async function getAdminVehicleDetail(vehicleId: string) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, status: { not: 'deleted' } },
    include: vehicleInclude,
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };
  return { ok: true as const, data: serializeVehicle(vehicle) };
}

export async function approveAdminVehicle(vehicleId: string, ctx: AdminContext) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, status: { not: 'deleted' } },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status: 'approved',
      rejectReason: null,
      autoRejected: false,
    },
    include: vehicleInclude,
  });

  await audit(ctx, {
    action: 'approve',
    entityType: 'vehicle',
    entityId: vehicleId,
    before: { status: vehicle.status, rejectReason: vehicle.rejectReason },
    after: { status: 'approved' },
  });

  return { ok: true as const, data: serializeVehicle(updated) };
}

export async function rejectAdminVehicle(
  vehicleId: string,
  reason: string | undefined,
  ctx: AdminContext
) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, status: { not: 'deleted' } },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };

  const rejectReason = reason?.trim() || 'Rechazado por administración MOVI';
  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status: 'rejected',
      rejectReason,
      autoRejected: false,
    },
    include: vehicleInclude,
  });

  await audit(ctx, {
    action: 'reject',
    entityType: 'vehicle',
    entityId: vehicleId,
    before: { status: vehicle.status },
    after: { status: 'rejected', rejectReason },
  });

  return { ok: true as const, data: serializeVehicle(updated) };
}

export async function suspendAdminVehicle(vehicleId: string, ctx: AdminContext) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, status: { not: 'deleted' } },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status: 'suspended' },
    include: vehicleInclude,
  });

  await audit(ctx, {
    action: 'suspend',
    entityType: 'vehicle',
    entityId: vehicleId,
    before: { status: vehicle.status },
    after: { status: 'suspended' },
  });

  return { ok: true as const, data: serializeVehicle(updated) };
}

export async function reactivateAdminVehicle(vehicleId: string, ctx: AdminContext) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, status: { not: 'deleted' } },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };
  if (vehicle.status !== 'suspended' && vehicle.status !== 'rejected') {
    return { ok: false as const, error: 'Solo se puede reactivar un vehículo suspendido o rechazado' };
  }

  const nextStatus: VehicleVerificationStatus =
    vehicle.status === 'rejected' ? 'under_review' : 'approved';

  const updated = await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status: nextStatus,
      rejectReason: nextStatus === 'under_review' ? vehicle.rejectReason : null,
      autoRejected: false,
    },
    include: vehicleInclude,
  });

  await audit(ctx, {
    action: 'unsuspend',
    entityType: 'vehicle',
    entityId: vehicleId,
    before: { status: vehicle.status },
    after: { status: nextStatus },
  });

  return { ok: true as const, data: serializeVehicle(updated) };
}

export async function deleteAdminVehicle(vehicleId: string, ctx: AdminContext) {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, status: { not: 'deleted' } },
  });
  if (!vehicle) return { ok: false as const, error: 'Vehículo no encontrado' };

  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      status: 'deleted',
      deletedAt: new Date(),
      deletedBy: ctx.adminUserId,
    },
  });

  await audit(ctx, {
    action: 'delete',
    entityType: 'vehicle',
    entityId: vehicleId,
    before: { status: vehicle.status },
    after: { status: 'deleted' },
  });

  return { ok: true as const, data: { deleted: true, id: vehicleId } };
}
