export type MvpVerificationStatus =
  | 'PENDING_DOCUMENTS'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

export type MvpSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';

const OWNER_MAP: Record<string, MvpVerificationStatus> = {
  pending: 'PENDING_DOCUMENTS',
  documents_uploaded: 'PENDING_DOCUMENTS',
  selfie_pending: 'PENDING_DOCUMENTS',
  under_review: 'PENDING_REVIEW',
  approved: 'VERIFIED',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
};

const VEHICLE_MAP: Record<string, MvpVerificationStatus> = {
  draft: 'PENDING_DOCUMENTS',
  documents_uploaded: 'PENDING_DOCUMENTS',
  under_review: 'PENDING_REVIEW',
  approved: 'VERIFIED',
  rejected: 'REJECTED',
  suspended: 'SUSPENDED',
};

const DRIVER_MAP: Record<string, MvpVerificationStatus> = {
  pending: 'PENDING_REVIEW',
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
  return DRIVER_MAP[status] ?? 'PENDING_REVIEW';
}

export const MVP_STATUS_LABELS: Record<MvpVerificationStatus, string> = {
  PENDING_DOCUMENTS: 'Documentos pendientes',
  PENDING_REVIEW: 'En revisión',
  VERIFIED: 'Verificado',
  REJECTED: 'Rechazado',
  SUSPENDED: 'Suspendido',
};

export function isVerified(status: MvpVerificationStatus): boolean {
  return status === 'VERIFIED';
}
