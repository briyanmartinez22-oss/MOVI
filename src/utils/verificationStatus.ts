/**
 * Mapeo legacy → estados MVP/admin simplificados.
 * Los estados de DB se conservan; la UI usa fases simples vía src/domain/moviFlow.ts.
 */
export type MvpVerificationStatus =
  | 'PENDING_DOCUMENTS'
  | 'PENDING_REVIEW'
  | 'PENDING_APPROVAL'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'DELETED';

const OWNER_MAP: Record<string, MvpVerificationStatus> = {
  pending: 'PENDING_DOCUMENTS',
  documents_uploaded: 'PENDING_DOCUMENTS',
  selfie_pending: 'PENDING_DOCUMENTS',
  under_review: 'PENDING_REVIEW',
  approved: 'VERIFIED',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
  deleted: 'DELETED',
};

const VEHICLE_MAP: Record<string, MvpVerificationStatus> = {
  draft: 'PENDING_DOCUMENTS',
  incomplete: 'PENDING_DOCUMENTS',
  documents_uploaded: 'PENDING_DOCUMENTS',
  under_review: 'PENDING_REVIEW',
  approved: 'VERIFIED',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
};

const DRIVER_MAP: Record<string, MvpVerificationStatus> = {
  pending: 'PENDING_APPROVAL',
  approved: 'VERIFIED',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
};

export function mapOwnerMvpStatus(status: string): MvpVerificationStatus {
  return OWNER_MAP[status] ?? 'PENDING_DOCUMENTS';
}

export function mapVehicleMvpStatus(status: string): MvpVerificationStatus {
  return VEHICLE_MAP[status] ?? 'PENDING_DOCUMENTS';
}

export function mapDriverMvpStatus(status: string): MvpVerificationStatus {
  return DRIVER_MAP[status] ?? 'PENDING_APPROVAL';
}

export const MVP_STATUS_LABELS: Record<MvpVerificationStatus, string> = {
  PENDING_DOCUMENTS: 'Incompleto',
  PENDING_REVIEW: 'En revisión',
  PENDING_APPROVAL: 'Pendiente de aprobación',
  VERIFIED: 'Aprobado',
  REJECTED: 'Rechazado',
  SUSPENDED: 'Bloqueado',
  DELETED: 'Eliminado',
};

export function isVerified(status: MvpVerificationStatus): boolean {
  return status === 'VERIFIED';
}
