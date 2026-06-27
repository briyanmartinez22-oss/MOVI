import type { OwnerDocuments, OwnerVerificationStatus } from '../types/models';
import {
  assessOwnerVerificationReadiness,
  getOwnerFlowPhase,
  MOVI_FLOW_LABELS,
  ownerCanSubmitVerification,
  ownerIsInAdminQueue,
  ownerMustCompleteOnboarding,
  ownerCanOperateFleet,
  resolveOwnerDocumentType,
  type MoviFlowPhase,
} from '../domain/moviFlow';

export type OwnerDocKey = 'duiFront' | 'duiBack' | 'licenseFront' | 'licenseBack';
export type OwnerFlowPhase = MoviFlowPhase;

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

export {
  assessOwnerVerificationReadiness,
  getOwnerFlowPhase,
  ownerCanSubmitVerification,
  ownerCanOperateFleet,
  ownerIsInAdminQueue,
  ownerMustCompleteOnboarding,
  resolveOwnerDocumentType,
};

export function ownerIsDraft(status: OwnerVerificationStatus | string | undefined): boolean {
  return getOwnerFlowPhase(status) === 'draft';
}

export function ownerIsSubmitted(status: OwnerVerificationStatus | string | undefined): boolean {
  return getOwnerFlowPhase(status) === 'submitted';
}

export const OWNER_FLOW_STATUS_LABELS: Record<OwnerFlowPhase, string> = MOVI_FLOW_LABELS;
