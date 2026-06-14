export type VehicleOperationalStatus =
  | 'draft'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'suspended';

export function getVehicleStatusLabel(status: string): string {
  switch (status) {
    case 'draft':
      return 'Borrador';
    case 'under_review':
      return 'Pendiente de aprobación';
    case 'approved':
      return 'Vehículo aprobado';
    case 'rejected':
      return 'Rechazado';
    case 'suspended':
      return 'Suspendido';
    default:
      return status.replace(/_/g, ' ');
  }
}

export function getVehicleApprovalHint(status: string): string | null {
  switch (status) {
    case 'draft':
    case 'under_review':
      return 'Tu vehículo está pendiente de aprobación. Este vehículo aún no puede operar.';
    case 'approved':
      return 'Vehículo aprobado. Ya puedes invitar conductores.';
    case 'rejected':
    case 'suspended':
      return 'Este vehículo aún no puede operar.';
    default:
      return null;
  }
}

export function canVehicleInviteDrivers(status: string): boolean {
  return status === 'approved';
}

export function canVehicleOperate(status: string): boolean {
  return status === 'approved';
}
