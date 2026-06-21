import type { TripRequest } from './index';

export type OperationsLiveSnapshot = {
  driversOnline: number;
  driversBusy: number;
  activeTrips: number;
  pendingTrips: number;
  avgWaitMinutes: number;
  slaWaitMinutes: number;
  noMatchMinutes: number;
};

export type LiveDriver = {
  driverId: string;
  sessionId: string;
  name: string;
  vehicleType: string | null;
  unitNumber: string | null;
  plateNumber: string | null;
  busy: boolean;
  activeTripId: string | null;
  activeTripStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  speed: number | null;
  heading: number | null;
  locationUpdatedAt: string | null;
  connectedAt: string;
};

export type DriverLocationUpdatePayload = LiveDriver & {
  latitude: number;
  longitude: number;
  locationUpdatedAt: string;
};

export type OperationsAlert = {
  id: string;
  type: 'no_match' | 'cancellation' | 'sla';
  tripId: string;
  passengerName: string;
  message: string;
  severity: 'warning' | 'critical';
  createdAt: string;
};

export type ReassignDriverOption = {
  driverId: string;
  name: string;
  vehicleType: string | null;
  unitNumber: string | null;
  plateNumber: string | null;
};

export type OperationsLiveBundle = {
  snapshot: OperationsLiveSnapshot | null;
  drivers: LiveDriver[];
  trips: TripRequest[];
  alerts: OperationsAlert[];
};
