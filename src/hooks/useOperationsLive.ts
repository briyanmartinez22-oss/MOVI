import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchOperationsLiveBundle,
  fetchOperationsLiveSnapshot,
  fetchAdminAlerts,
} from '../services/api';
import { useMockApi } from '../services/api/config';
import { realtimeClient } from '../services/realtimeClient';
import type { TripRequest } from '../types';
import type {
  DriverLocationUpdatePayload,
  LiveDriver,
  OperationsLiveSnapshot,
} from '../types/operationsLive';
import type { OperationalAlertRecord } from '../types/adminCenter';

function mergeDriverLocation(
  prev: LiveDriver[],
  payload: DriverLocationUpdatePayload
): LiveDriver[] {
  const idx = prev.findIndex((d) => d.driverId === payload.driverId);
  const base: LiveDriver =
    idx >= 0
      ? prev[idx]
      : {
          driverId: payload.driverId,
          sessionId: payload.sessionId,
          name: payload.name,
          vehicleType: payload.vehicleType,
          unitNumber: payload.unitNumber,
          plateNumber: payload.plateNumber,
          busy: payload.busy,
          activeTripId: payload.activeTripId,
          activeTripStatus: payload.activeTripStatus,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed,
          heading: payload.heading,
          locationUpdatedAt: payload.locationUpdatedAt,
          connectedAt: payload.locationUpdatedAt,
        };

  const updated: LiveDriver = {
    ...base,
    name: payload.name ?? base.name,
    sessionId: payload.sessionId ?? base.sessionId,
    vehicleType: payload.vehicleType ?? base.vehicleType,
    unitNumber: payload.unitNumber ?? base.unitNumber,
    plateNumber: payload.plateNumber ?? base.plateNumber,
    busy: payload.busy,
    activeTripId: payload.activeTripId,
    activeTripStatus: payload.activeTripStatus,
    latitude: payload.latitude,
    longitude: payload.longitude,
    speed: payload.speed,
    heading: payload.heading,
    locationUpdatedAt: payload.locationUpdatedAt,
  };

  if (idx >= 0) {
    const next = [...prev];
    next[idx] = updated;
    return next;
  }
  return [...prev, updated];
}

export function useOperationsLive() {
  const mockMode = useMockApi();
  const [snapshot, setSnapshot] = useState<OperationsLiveSnapshot | null>(null);
  const [drivers, setDrivers] = useState<LiveDriver[]>([]);
  const [trips, setTrips] = useState<TripRequest[]>([]);
  const [alerts, setAlerts] = useState<OperationalAlertRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const driversRef = useRef(drivers);
  driversRef.current = drivers;

  const load = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const bundle = await fetchOperationsLiveBundle();
      setSnapshot(bundle.snapshot);
      setDrivers(bundle.drivers);
      setTrips(bundle.trips);
      setAlerts(await fetchAdminAlerts());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const refreshSnapshot = useCallback(async () => {
    const data = await fetchOperationsLiveSnapshot();
    if (data) setSnapshot(data);
  }, []);

  const upsertTrip = useCallback((trip: TripRequest) => {
    setTrips((prev) => {
      const idx = prev.findIndex((t) => t.id === trip.id);
      if (
        trip.lifecycleStatus === 'trip_completed' ||
        trip.lifecycleStatus === 'cancelled'
      ) {
        return prev.filter((t) => t.id !== trip.id);
      }
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = trip;
        return next;
      }
      return [trip, ...prev];
    });
  }, []);

  const applyDriverLocation = useCallback((payload: DriverLocationUpdatePayload) => {
    setDrivers((prev) => mergeDriverLocation(prev, payload));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (mockMode) return;

    realtimeClient.subscribeAdminOps();

    const offTripUpdated = realtimeClient.on('ops_trip_updated', (payload) => {
      const trip = payload as TripRequest;
      if (trip?.id) upsertTrip(trip);
      void refreshSnapshot();
      void fetchAdminAlerts().then(setAlerts);
    });

    const offTripNew = realtimeClient.on('ops_trip_new', (payload) => {
      const trip = payload as TripRequest;
      if (trip?.id) upsertTrip(trip);
      void refreshSnapshot();
      void fetchAdminAlerts().then(setAlerts);
    });

    const offRefresh = realtimeClient.on('ops_refresh', () => {
      void load(true);
    });

    const offDriverLocation = realtimeClient.on('driver_location_update', (payload) => {
      const update = payload as DriverLocationUpdatePayload;
      if (!update?.driverId) return;
      applyDriverLocation(update);
    });

    return () => {
      offTripUpdated();
      offTripNew();
      offRefresh();
      offDriverLocation();
      realtimeClient.unsubscribeAdminOps();
    };
  }, [mockMode, load, upsertTrip, refreshSnapshot, applyDriverLocation]);

  return {
    snapshot,
    drivers,
    trips,
    alerts,
    loading,
    refreshing,
    mockMode,
    reload: () => load(false),
    upsertTrip,
    applyDriverLocation,
  };
}
