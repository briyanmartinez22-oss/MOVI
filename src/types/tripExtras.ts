import type { ServiceRequestType, ServiceType } from './models';

export type { ServiceRequestType, ServiceType };

/** Detalles de carga para solicitudes con pickup o camión */
export interface CargoDetails {
  weightKg?: number;
  itemCount?: number;
  dimensions?: string;
  requiresLoadingHelp?: boolean;
  fragile?: boolean;
  notes?: string;
}
