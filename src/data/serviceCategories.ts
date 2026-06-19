import type { ServiceRequestType, ServiceType, VehicleType } from '../types/models';
import type { TripType } from '../types';

export type ServiceCategoryId =
  | 'mototaxi'
  | 'automovil'
  | 'pickup'
  | 'microbus'
  | 'mensajeria'
  | 'flete_ligero'
  | 'compras_mandados';

export interface ServiceCategoryConfig {
  id: ServiceCategoryId;
  label: string;
  description: string;
  emoji: string;
  vehicleTypes: VehicleType[];
  supportsShared: boolean;
  serviceType: ServiceType;
  requestType: ServiceRequestType;
  pricing: {
    sharedMin?: number;
    privateMin: number;
  };
  requestButtonLabel: string;
  matchingLabel: string;
  vehicleSectionLabel: string;
}

export const SERVICE_CATEGORIES: ServiceCategoryConfig[] = [
  {
    id: 'mototaxi',
    label: 'Mototaxi',
    description: 'Viaje urbano en mototaxi o qute',
    emoji: '🛺',
    vehicleTypes: ['mototaxi', 'qute', 'motocicleta'],
    supportsShared: true,
    serviceType: 'movi_ride',
    requestType: 'viaje',
    pricing: { sharedMin: 0.5, privateMin: 1.0 },
    requestButtonLabel: 'Solicitar Viaje',
    matchingLabel: 'conductores de mototaxi',
    vehicleSectionLabel: 'Tu mototaxi',
  },
  {
    id: 'automovil',
    label: 'Automóvil',
    description: 'Viaje en sedán o auto particular',
    emoji: '🚗',
    vehicleTypes: ['sedan'],
    supportsShared: true,
    serviceType: 'movi_ride',
    requestType: 'viaje',
    pricing: { sharedMin: 1.5, privateMin: 2.5 },
    requestButtonLabel: 'Solicitar Viaje',
    matchingLabel: 'conductores de automóvil',
    vehicleSectionLabel: 'Tu automóvil',
  },
  {
    id: 'pickup',
    label: 'Pickup',
    description: 'Viaje o carga ligera en pickup',
    emoji: '🛻',
    vehicleTypes: ['pickup', 'camioneta'],
    supportsShared: true,
    serviceType: 'movi_ride',
    requestType: 'viaje',
    pricing: { sharedMin: 2.0, privateMin: 3.0 },
    requestButtonLabel: 'Solicitar Viaje',
    matchingLabel: 'conductores de pickup',
    vehicleSectionLabel: 'Tu pickup',
  },
  {
    id: 'microbus',
    label: 'Microbús',
    description: 'Transporte grupal o privado',
    emoji: '🚌',
    vehicleTypes: ['microbus'],
    supportsShared: false,
    serviceType: 'movi_ride',
    requestType: 'transporte_grupal',
    pricing: { privateMin: 4.0 },
    requestButtonLabel: 'Solicitar Viaje',
    matchingLabel: 'conductores de microbús',
    vehicleSectionLabel: 'Tu microbús',
  },
  {
    id: 'mensajeria',
    label: 'Mensajería',
    description: 'Envío de documentos o paquetes pequeños',
    emoji: '📦',
    vehicleTypes: ['mototaxi', 'motocicleta', 'qute'],
    supportsShared: false,
    serviceType: 'movi_delivery',
    requestType: 'paqueteria',
    pricing: { privateMin: 1.5 },
    requestButtonLabel: 'Solicitar Servicio',
    matchingLabel: 'mensajeros disponibles',
    vehicleSectionLabel: 'Tu mensajero',
  },
  {
    id: 'flete_ligero',
    label: 'Flete ligero',
    description: 'Transporte de carga en pickup o camioneta',
    emoji: '🚚',
    vehicleTypes: ['pickup', 'camioneta', 'camion'],
    supportsShared: false,
    serviceType: 'movi_cargo',
    requestType: 'carga',
    pricing: { privateMin: 2.5 },
    requestButtonLabel: 'Solicitar Servicio',
    matchingLabel: 'conductores de flete',
    vehicleSectionLabel: 'Tu vehículo de carga',
  },
  {
    id: 'compras_mandados',
    label: 'Compras y mandados',
    description: 'Recolección y entrega de compras',
    emoji: '🛒',
    vehicleTypes: ['mototaxi', 'motocicleta', 'qute'],
    supportsShared: false,
    serviceType: 'movi_delivery',
    requestType: 'entrega',
    pricing: { privateMin: 1.0 },
    requestButtonLabel: 'Solicitar Servicio',
    matchingLabel: 'conductores para mandados',
    vehicleSectionLabel: 'Tu conductor',
  },
];

export const DEFAULT_SERVICE_CATEGORY_ID: ServiceCategoryId = 'mototaxi';

export function getServiceCategory(id?: ServiceCategoryId): ServiceCategoryConfig {
  return (
    SERVICE_CATEGORIES.find((c) => c.id === id) ??
    SERVICE_CATEGORIES.find((c) => c.id === DEFAULT_SERVICE_CATEGORY_ID)!
  );
}

export function getCategoryMinPrice(categoryId: ServiceCategoryId, tripType: TripType): number {
  const category = getServiceCategory(categoryId);
  if (tripType === 'shared' && category.supportsShared && category.pricing.sharedMin != null) {
    return category.pricing.sharedMin;
  }
  return category.pricing.privateMin;
}

export function getCategoryModeLabel(categoryId: ServiceCategoryId, tripType: TripType): string {
  const category = getServiceCategory(categoryId);
  const mode = tripType === 'shared' ? 'Compartido' : 'Privado';
  return `${category.label} ${mode}`;
}

export function isVehicleCompatibleWithCategory(
  vehicleType: VehicleType | undefined,
  categoryId: ServiceCategoryId
): boolean {
  const category = getServiceCategory(categoryId);
  const normalized = vehicleType ?? 'mototaxi';
  return category.vehicleTypes.includes(normalized === 'tuk_tuk_red' ? 'mototaxi' : normalized);
}

export function resolveTripTypeForCategory(
  categoryId: ServiceCategoryId,
  tripType: TripType
): TripType {
  const category = getServiceCategory(categoryId);
  if (!category.supportsShared) return 'private';
  return tripType;
}

export function getPrimaryVehicleType(categoryId: ServiceCategoryId): VehicleType {
  return getServiceCategory(categoryId).vehicleTypes[0];
}
