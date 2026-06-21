export type TripCancelledBy = 'passenger' | 'driver';

export function formatCancelledByLabel(by?: TripCancelledBy | string | null): string {
  if (by === 'passenger') return 'Cancelado por pasajero';
  if (by === 'driver') return 'Cancelado por conductor';
  return 'Cancelado';
}

export function isTripCancelledStatus(status?: string | null): boolean {
  return status === 'cancelled';
}

export function tripHistoryEndedAt(record: {
  status: string;
  completedAt: string;
  cancelledAt?: string;
}): string {
  if (isTripCancelledStatus(record.status)) {
    return record.cancelledAt ?? record.completedAt;
  }
  return record.completedAt;
}
