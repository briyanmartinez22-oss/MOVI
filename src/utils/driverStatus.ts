export function getDriverStatusLabel(status: string): string {
  switch (status) {
    case 'pending':
      return 'Pendiente de aprobación';
    case 'approved':
      return 'Conductor aprobado';
    case 'rejected':
      return 'Rechazado';
    case 'suspended':
      return 'Suspendido';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function getDriverApprovalHint(status: string): string | null {
  switch (status) {
    case 'pending':
      return 'Licencia enviada. Tu perfil de conductor está pendiente de aprobación.';
    case 'approved':
      return 'Conductor aprobado. Ya puedes operar esta unidad.';
    case 'rejected':
    case 'suspended':
      return 'Tu perfil de conductor no puede operar en este momento.';
    default:
      return null;
  }
}

export function hasDriverLicenseUploaded(driver: {
  licenseFront?: string;
  licenseBack?: string;
}): boolean {
  return Boolean(driver.licenseFront?.trim() && driver.licenseBack?.trim());
}

export function canDriverOperateVehicle(status: string): boolean {
  return status === 'approved';
}
