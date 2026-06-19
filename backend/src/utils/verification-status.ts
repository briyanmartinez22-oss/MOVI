/** MVP provider verification states exposed to clients. */
export type MvpVerificationStatus =
  | 'PENDING_DOCUMENTS'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED'
  | 'SUSPENDED';

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

export function isVerifiedMvpStatus(status: MvpVerificationStatus): boolean {
  return status === 'VERIFIED';
}
