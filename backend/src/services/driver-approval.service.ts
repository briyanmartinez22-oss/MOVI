import { prisma } from '../lib/prisma';

export type DriverApprovalStatus =
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED';

const STATUS_MAP: Record<string, DriverApprovalStatus> = {
  pending: 'PENDING_APPROVAL',
  approved: 'APPROVED',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
  deleted: 'REJECTED',
};

export function mapDriverApprovalStatus(status: string): DriverApprovalStatus {
  return STATUS_MAP[status] ?? 'PENDING_APPROVAL';
}

export async function assertDriverApprovedForOperations(userId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId } });
  if (!driver) {
    return { ok: false as const, error: 'Perfil de conductor no encontrado.' };
  }
  if (driver.status === 'pending') {
    return {
      ok: false as const,
      error: 'Tu perfil está pendiente de aprobación por un administrador.',
      approvalStatus: 'PENDING_APPROVAL' as const,
    };
  }
  if (driver.status === 'rejected') {
    return {
      ok: false as const,
      error: 'Tu registro fue rechazado. Contacta soporte MOVI.',
      approvalStatus: 'REJECTED' as const,
    };
  }
  if (driver.status === 'suspended') {
    return {
      ok: false as const,
      error: 'Tu cuenta de conductor está suspendida.',
      approvalStatus: 'SUSPENDED' as const,
    };
  }
  if (driver.status !== 'approved') {
    return { ok: false as const, error: 'Conductor no autorizado.' };
  }
  return { ok: true as const, driver, approvalStatus: 'APPROVED' as const };
}

export function enrichDriverRecord<T extends { status: string }>(driver: T) {
  return {
    ...driver,
    approvalStatus: mapDriverApprovalStatus(driver.status),
  };
}
