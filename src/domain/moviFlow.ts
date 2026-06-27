import type {
  DriverProfileRecord,
  Owner,
  OwnerDocuments,
  OwnerVerificationStatus,
  Vehicle,
  VehicleVerificationStatus,
} from '../types/models';

/** Estados simplificados de flujo MOVI (UI y guards). */
export type MoviFlowPhase = 'draft' | 'submitted' | 'approved' | 'rejected' | 'blocked';

export type MoviSubscriptionPhase = 'active' | 'past_due' | 'blocked';

export const MOVI_FLOW_LABELS: Record<MoviFlowPhase, string> = {
  draft: 'Incompleto — completa tu verificación',
  submitted: 'Enviado — en revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado — corrige y reenvía',
  blocked: 'Bloqueado',
};

export const MOVI_SUBSCRIPTION_LABELS: Record<MoviSubscriptionPhase, string> = {
  active: 'Activa',
  past_due: 'Pago pendiente',
  blocked: 'Bloqueada',
};

export function getOwnerFlowPhase(status: OwnerVerificationStatus | string | undefined): MoviFlowPhase {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'under_review':
      return 'submitted';
    case 'suspended':
    case 'deleted':
      return 'blocked';
    default:
      return 'draft';
  }
}

export function getVehicleFlowPhase(status: VehicleVerificationStatus | string | undefined): MoviFlowPhase {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'under_review':
      return 'submitted';
    case 'suspended':
      return 'blocked';
    default:
      return 'draft';
  }
}

export function getDriverFlowPhase(status: string | undefined): MoviFlowPhase {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'rejected':
      return 'rejected';
    case 'suspended':
    case 'deleted':
      return 'blocked';
    default:
      return 'draft';
  }
}

export function ownerMustCompleteOnboarding(status: OwnerVerificationStatus | string | undefined): boolean {
  const phase = getOwnerFlowPhase(status);
  return phase === 'draft' || phase === 'rejected';
}

export function ownerCanSubmitVerification(status: OwnerVerificationStatus | string | undefined): boolean {
  const phase = getOwnerFlowPhase(status);
  return phase === 'draft' || phase === 'rejected';
}

export function ownerCanOperateFleet(status: OwnerVerificationStatus | string | undefined): boolean {
  return getOwnerFlowPhase(status) === 'approved';
}

export function ownerIsInAdminQueue(status: OwnerVerificationStatus | string | undefined): boolean {
  return status === 'under_review';
}

export function vehicleIsInAdminQueue(status: VehicleVerificationStatus | string | undefined): boolean {
  return status === 'under_review';
}

export function driverIsInAdminQueue(
  driver: Pick<DriverProfileRecord, 'status'> & { documents?: Partial<OwnerDocuments> }
): boolean {
  if (driver.status !== 'pending') return false;
  const docs = driver.documents ?? {};
  return Boolean(docs.licenseFront?.trim() && docs.licenseBack?.trim());
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

  const docFields =
    input.documentType === 'LICENSE'
      ? ([
          { key: 'licenseFront' as const, label: 'Licencia — frontal' },
          { key: 'licenseBack' as const, label: 'Licencia — trasera' },
        ] as const)
      : ([
          { key: 'duiFront' as const, label: 'DUI — frontal' },
          { key: 'duiBack' as const, label: 'DUI — trasera' },
        ] as const);

  for (const field of docFields) {
    if (!input.documents[field.key]?.trim()) missing.push(field.label);
  }

  return { ready: missing.length === 0, missing };
}

export function resolveOwnerDocumentType(value: unknown): 'DUI' | 'LICENSE' {
  return value === 'LICENSE' ? 'LICENSE' : 'DUI';
}

export function canDriverOperate(input: {
  owner?: Owner;
  vehicle?: Vehicle;
  driver?: DriverProfileRecord;
}): { allowed: boolean; reason?: string } {
  const ownerPhase = getOwnerFlowPhase(input.owner?.status);
  if (ownerPhase !== 'approved') {
    return { allowed: false, reason: 'El dueño de la unidad aún no está aprobado.' };
  }

  const vehiclePhase = getVehicleFlowPhase(input.vehicle?.status);
  if (vehiclePhase !== 'approved') {
    return { allowed: false, reason: 'La unidad aún no está aprobada.' };
  }

  const driverPhase = getDriverFlowPhase(input.driver?.status);
  if (driverPhase !== 'approved') {
    return { allowed: false, reason: 'Tu perfil de conductor está pendiente de aprobación.' };
  }

  if (!input.driver?.inviteCodeUsed) {
    return { allowed: false, reason: 'Debes registrarte con una invitación válida del dueño.' };
  }

  return { allowed: true };
}
