import type { VehicleType } from '../types/models';

export const SCHEDULABLE_VEHICLE_TYPES = ['microbus', 'pickup', 'camion'] as const;

export type RequestMode = 'NOW' | 'SCHEDULED';

export function normalizeVehicleType(type?: VehicleType | string | null): VehicleType {
  if (!type || type === 'tuk_tuk_red') return 'mototaxi';
  return type as VehicleType;
}

export function isSchedulableVehicleType(type?: VehicleType | string | null): boolean {
  const normalized = normalizeVehicleType(type);
  return SCHEDULABLE_VEHICLE_TYPES.includes(normalized as (typeof SCHEDULABLE_VEHICLE_TYPES)[number]);
}

export function canShowScheduleOption(vehicleType: VehicleType | string): boolean {
  return isSchedulableVehicleType(vehicleType);
}

export function getVehicleRadiusKm(vehicleType: VehicleType | string): number {
  const map: Record<string, number> = {
    mototaxi: 5,
    tuk_tuk_red: 5,
    qute: 5,
    motocicleta: 7,
    sedan: 8,
    pickup: 12,
    camioneta: 12,
    camion: 20,
    microbus: 15,
  };
  return map[normalizeVehicleType(vehicleType)] ?? 8;
}
