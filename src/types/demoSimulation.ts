/** Metadatos agregados de la simulación demo (volúmenes de producción). */
export interface DemoSimulationMeta {
  version: 1;
  seed: number;
  generatedAt: string;
  totalPlatformUsers: number;
  totalPassengers: number;
  totalDrivers: number;
  totalOwners: number;
  totalBusinesses: number;
  totalVehicles: number;
  totalTrips: number;
  totalDeliveries: number;
  tripsToday: number;
  tripsWeek: number;
  tripsMonth: number;
  deliveriesToday: number;
  deliveriesWeek: number;
  deliveriesMonth: number;
  driversActive: number;
  driversOnTrial: number;
  driversPastDue: number;
  driversSuspended: number;
  driversConnected: number;
  mrr: number;
  arr: number;
  retentionPct: number;
  churnPct: number;
  conversionPct: number;
  avgArrivalMinutes: number;
  avgResponseSeconds: number;
  complaints: number;
  reports: number;
  cancellations: number;
}

export interface PassengerProfileExtra {
  userId: string;
  firstName: string;
  lastName: string;
  city: string;
  profilePhotoUrl: string;
  tripCount: number;
}

export interface DriverDashboardStats {
  earningsWeek: number;
  earningsMonth: number;
  tripsWeek: number;
  tripsMonth: number;
  deliveriesWeek: number;
  deliveriesMonth: number;
  hoursConnectedWeek: number;
  hoursConnectedMonth: number;
}

export interface OwnerDashboardStats {
  income: number;
  trips: number;
  deliveries: number;
  kilometers: number;
  activeHours: number;
  byUnit: Record<
    string,
    { unitNumber: string; trips: number; deliveries: number; income: number; km: number }
  >;
}

export interface BusinessDashboardStats {
  orders: number;
  deliveries: number;
  invoices: number;
  costs: number;
}

export interface DemoRoleStats {
  drivers: Record<string, DriverDashboardStats>;
  owners: Record<string, OwnerDashboardStats>;
  businesses: Record<string, BusinessDashboardStats>;
}
