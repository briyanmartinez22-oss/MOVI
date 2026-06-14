import type { TripLifecycleStatus } from '../types';

/** Fases del flujo conductor tras oferta aceptada. */
export type DriverTripPhase = 'pickup' | 'arrived' | 'in_progress' | 'completed';

const ACTIVE_DRIVER_STATUSES: TripLifecycleStatus[] = [
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
];

export function isDriverTripActive(
  lifecycle: TripLifecycleStatus | undefined,
  isAssignedDriver: boolean
): boolean {
  if (!isAssignedDriver || !lifecycle) return false;
  return ACTIVE_DRIVER_STATUSES.includes(lifecycle);
}

export function getDriverTripPhase(lifecycle: TripLifecycleStatus): DriverTripPhase {
  switch (lifecycle) {
    case 'accepted':
    case 'driver_arriving':
      return 'pickup';
    case 'driver_arrived':
      return 'arrived';
    case 'trip_started':
      return 'in_progress';
    case 'trip_completed':
      return 'completed';
    default:
      return 'pickup';
  }
}

export const DRIVER_STATUS_LABELS: Record<DriverTripPhase, string> = {
  pickup: 'Viaje aceptado',
  arrived: 'Pasajero en punto',
  in_progress: 'Viaje en curso',
  completed: 'Viaje completado',
};

export const DRIVER_BANNER_LABELS: Record<DriverTripPhase, string> = {
  pickup: 'Ve al punto de recogida',
  arrived: 'Recoge al pasajero',
  in_progress: 'Lleva al pasajero al destino',
  completed: 'Viaje finalizado',
};
