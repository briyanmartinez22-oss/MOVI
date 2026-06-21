import type { MapMarker, TripRequest } from '../types';
import type {
  LiveDriver,
  OperationsAlert,
  OperationsLiveBundle,
  OperationsLiveSnapshot,
  ReassignDriverOption,
} from '../types/operationsLive';
import { salvadorPlaces } from '../data/mock';
import { getLiveOperationsSnapshot, getOperationsMapMarkers } from './analyticsService';
import { getStore } from './mockStore';

const SLA_WAIT_MINUTES = 5;
const NO_MATCH_MINUTES = 3;

function buildMockSnapshot(): OperationsLiveSnapshot {
  const live = getLiveOperationsSnapshot();
  const sessions = getStore().sessions.filter((s) => !s.disconnectedAt);
  const busyDrivers = sessions.filter((s) => {
    const driverTrips = getStore().tripHistory.filter(
      (t) =>
        t.driverId === s.driverId &&
        t.status !== 'trip_completed' &&
        t.status !== 'cancelled'
    );
    return driverTrips.length > 0;
  });

  return {
    driversOnline: sessions.length,
    driversBusy: busyDrivers.length,
    activeTrips: live.activeTrips,
    pendingTrips: live.pendingRequests,
    avgWaitMinutes: live.pendingRequests > 0 ? 4.2 : 0,
    slaWaitMinutes: SLA_WAIT_MINUTES,
    noMatchMinutes: NO_MATCH_MINUTES,
  };
}

function buildMockDrivers(): LiveDriver[] {
  const store = getStore();
  const zones = store.demandZones;

  return store.sessions
    .filter((s) => !s.disconnectedAt)
    .map((session, i) => {
      const driver = store.drivers.find((d) => d.id === session.driverId);
      const vehicle = store.vehicles.find((v) => v.vehicleId === session.vehicleId);
      const zone = zones[i % Math.max(zones.length, 1)];
      const coords = zone
        ? { latitude: zone.latitude, longitude: zone.longitude }
        : salvadorPlaces[1].coordinates;
      const activeTrip = store.tripHistory.find(
        (t) =>
          t.driverId === session.driverId &&
          t.status !== 'trip_completed' &&
          t.status !== 'cancelled'
      );

      return {
        driverId: session.driverId,
        sessionId: session.sessionId,
        name: driver?.name ?? 'Conductor',
        vehicleType: vehicle?.vehicleType ?? null,
        unitNumber: vehicle?.unitNumber ?? null,
        plateNumber: vehicle?.plateNumber ?? null,
        busy: Boolean(activeTrip),
        activeTripId: activeTrip?.id ?? null,
        activeTripStatus: activeTrip?.status ?? null,
        latitude: coords.latitude + (i % 3) * 0.002,
        longitude: coords.longitude - (i % 2) * 0.002,
        speed: activeTrip ? 8.5 : 0,
        heading: null,
        locationUpdatedAt: new Date().toISOString(),
        connectedAt: session.connectedAt,
      };
    });
}

function buildMockAlerts(): OperationsAlert[] {
  const store = getStore();
  const now = Date.now();
  const alerts: OperationsAlert[] = [];

  store.tripHistory
    .filter((t) => t.status === 'cancelled')
    .slice(0, 3)
    .forEach((t) => {
      alerts.push({
        id: `cancel-${t.id}`,
        type: 'cancellation',
        tripId: t.id,
        passengerName: t.passengerName,
        message: 'Cancelado (simulación)',
        severity: 'warning',
        createdAt: t.completedAt ?? new Date(now - 3600000).toISOString(),
      });
    });

  const pending = store.tripHistory.filter(
    (t) => t.status === 'requested' || t.status === 'offered' || t.status === 'searching'
  );
  pending.slice(0, 2).forEach((t, i) => {
    alerts.push({
      id: `sla-${t.id}`,
      type: 'sla',
      tripId: t.id,
      passengerName: t.passengerName,
      message: `Espera > ${SLA_WAIT_MINUTES} min (simulación)`,
      severity: i === 0 ? 'critical' : 'warning',
      createdAt: new Date(now - (i + 1) * 600000).toISOString(),
    });
  });

  if (pending.length > 0) {
    alerts.push({
      id: `no-match-${pending[0].id}`,
      type: 'no_match',
      tripId: pending[0].id,
      passengerName: pending[0].passengerName,
      message: 'Sin ofertas (simulación)',
      severity: 'critical',
      createdAt: new Date(now - NO_MATCH_MINUTES * 60000).toISOString(),
    });
  }

  return alerts;
}

function buildMockTrips(): TripRequest[] {
  const store = getStore();
  return store.tripHistory
    .filter((t) => t.status !== 'trip_completed' && t.status !== 'cancelled')
    .slice(0, 12)
    .map((t) => ({
      id: t.id,
      passengerName: t.passengerName,
      origin: {
        id: 'origin',
        name: t.originName,
        coordinates: salvadorPlaces[1].coordinates,
      },
      destination: {
        id: 'destination',
        name: t.destinationName,
        coordinates: salvadorPlaces[2].coordinates,
      },
      tripType: 'private' as const,
      distanceKm: t.distanceKm,
      status: t.status as TripRequest['status'],
      lifecycleStatus: t.status as TripRequest['lifecycleStatus'],
      offers: [],
      acceptedOffer: null,
      passengerCount: 1,
      description: '',
      createdAt: new Date(t.completedAt).getTime() - 600000,
    }));
}

export function getMockOperationsLiveBundle(): OperationsLiveBundle {
  return {
    snapshot: buildMockSnapshot(),
    drivers: buildMockDrivers(),
    trips: buildMockTrips(),
    alerts: buildMockAlerts(),
  };
}

export function getMockOperationsLiveMarkers(): MapMarker[] {
  return getOperationsMapMarkers();
}

export function getMockReassignDrivers(tripId: string): ReassignDriverOption[] {
  const store = getStore();
  return store.sessions
    .filter((s) => !s.disconnectedAt)
    .map((s) => {
      const driver = store.drivers.find((d) => d.id === s.driverId);
      const vehicle = store.vehicles.find((v) => v.vehicleId === s.vehicleId);
      const busy = store.tripHistory.some(
        (t) =>
          t.driverId === s.driverId &&
          t.id !== tripId &&
          t.status !== 'trip_completed' &&
          t.status !== 'cancelled'
      );
      if (busy || !driver) return null;
      return {
        driverId: s.driverId,
        name: driver.name,
        vehicleType: vehicle?.vehicleType != null ? String(vehicle.vehicleType) : null,
        unitNumber: vehicle?.unitNumber ?? null,
        plateNumber: vehicle?.plateNumber ?? null,
      };
    })
    .filter((d): d is ReassignDriverOption => d !== null);
}
