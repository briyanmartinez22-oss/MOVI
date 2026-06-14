import { ServiceRequestType, ServiceType } from '../types/models';

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  movi_ride: 'MOVI Ride',
  movi_delivery: 'MOVI Delivery',
  movi_cargo: 'MOVI Cargo',
  movi_business: 'MOVI Business',
};

export const REQUEST_TYPE_LABELS: Record<ServiceRequestType, string> = {
  viaje: 'Viaje',
  entrega: 'Entrega',
  paqueteria: 'Paquetería',
  carga: 'Carga',
  mudanza: 'Mudanza',
  transporte_animales: 'Transporte de animales',
  transporte_grupal: 'Transporte grupal',
  servicio_comercial: 'Servicio comercial',
};
