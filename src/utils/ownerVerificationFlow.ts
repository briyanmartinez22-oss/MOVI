import type { OwnerDocuments, OwnerVerificationStatus } from '../types/models';

export type OwnerDocKey = 'duiFront' | 'duiBack' | 'licenseFront' | 'licenseBack';

export type OwnerFlowPhase = 'draft' | 'submitted' | 'approved' | 'rejected' | 'suspended';

export const OWNER_DOC_FIELDS_BY_TYPE = {
  DUI: [
    { key: 'duiFront' as const, label: 'DUI — frontal' },
    { key: 'duiBack' as const, label: 'DUI — trasera' },
  ],
  LICENSE: [
    { key: 'licenseFront' as const, label: 'Licencia — frontal' },
    { key: 'licenseBack' as const, label: 'Licencia — trasera' },
  ],
} as const;

export function getOwnerFlowPhase(status: OwnerVerificationStatus | string | undefined): OwnerFlowPhase {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'suspended':
      return 'suspended';
    case 'under_review':
      return 'submitted';
    default:
      return 'draft';
  }
}

/** Borrador / incompleto — aún no enviado a admin. */
export function ownerIsDraft(status: OwnerVerificationStatus | string | undefined): boolean {
  return getOwnerFlowPhase(status) === 'draft';
}

export function ownerIsSubmitted(status: OwnerVerificationStatus | string | undefined): boolean {
  return getOwnerFlowPhase(status) === 'submitted';
}

export function ownerMustCompleteOnboarding(status: OwnerVerificationStatus | string | undefined): boolean {
  const phase = getOwnerFlowPhase(status);
  return phase === 'draft' || phase === 'rejected';
}

export function ownerCanSubmitVerification(status: OwnerVerificationStatus | string | undefined): boolean {
  const phase = getOwnerFlowPhase(status);
  return phase === 'draft' || phase === 'rejected';
}

export const OWNER_FLOW_STATUS_LABELS: Record<OwnerFlowPhase, string> = {
  draft: 'Borrador — completa tu verificación',
  submitted: 'Enviado — en revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado — corrige y reenvía',
  suspended: 'Suspendido',
};

export function resolveOwnerDocumentType(value: unknown): 'DUI' | 'LICENSE' {
  return value === 'LICENSE' ? 'LICENSE' : 'DUI';
}

export function assessOwnerVerificationReadiness(input: {
  firstName: string;
  lastName: string;
  dui: string;
  phone?: string;
  documentType: 'DUI' | 'LICENSE';
  profilePhoto?: string;
  documents: Partial<OwnerDocuments>;
}): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!input.firstName.trim()) missing.push('Nombres');
  if (!input.dui.trim()) missing.push('Número de documento');
  if (!input.phone?.trim()) missing.push('Teléfono');
  if (!input.profilePhoto?.trim()) missing.push('Foto de perfil');

  for (const field of OWNER_DOC_FIELDS_BY_TYPE[input.documentType]) {
    if (!input.documents[field.key]) missing.push(field.label);
  }

  return { ready: missing.length === 0, missing };
}
