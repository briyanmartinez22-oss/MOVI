import { DemandZone, HotspotServiceCategory, VehicleType } from '../types/models';
import { normalizeVehicleType } from './vehicleTypes';

export type HotspotServiceFilter = HotspotServiceCategory | 'all';
export type HotspotVehicleFilter = VehicleType | 'all';

export interface HotspotFilterState {
  service: HotspotServiceFilter;
  vehicleType: HotspotVehicleFilter;
}

export const HOTSPOT_SERVICE_OPTIONS: { key: HotspotServiceFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'viaje', label: 'Viajes' },
  { key: 'entrega', label: 'Entregas' },
  { key: 'carga', label: 'Carga' },
];

export const HOTSPOT_VEHICLE_OPTIONS: { key: HotspotVehicleFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'mototaxi', label: 'Mototaxi' },
  { key: 'qute', label: 'Qute' },
  { key: 'motocicleta', label: 'Moto' },
  { key: 'sedan', label: 'Sedán' },
  { key: 'camioneta', label: 'Camioneta' },
  { key: 'pickup', label: 'Pickup' },
  { key: 'camion', label: 'Camión' },
  { key: 'microbus', label: 'Microbús' },
];

export function filterDemandZones(
  zones: DemandZone[],
  filters: HotspotFilterState
): DemandZone[] {
  return zones.filter((zone) => {
    if (filters.service !== 'all' && zone.serviceCategory && zone.serviceCategory !== filters.service) {
      return false;
    }
    if (filters.vehicleType !== 'all') {
      const zoneType = normalizeVehicleType(zone.vehicleType);
      const filterType = normalizeVehicleType(filters.vehicleType);
      if (zone.vehicleType && zoneType !== filterType) return false;
    }
    return true;
  });
}

export function enrichDemandZones(zones: DemandZone[]): DemandZone[] {
  const services: HotspotServiceCategory[] = ['viaje', 'entrega', 'carga'];
  const vehicles: VehicleType[] = ['mototaxi', 'qute', 'motocicleta', 'sedan', 'pickup', 'camion'];

  return zones.map((zone, index) => ({
    ...zone,
    serviceCategory: zone.serviceCategory ?? services[index % services.length],
    vehicleType: zone.vehicleType ?? vehicles[index % vehicles.length],
  }));
}
