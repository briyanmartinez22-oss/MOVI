import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useMockApi } from '../services/api/config';
import { realtimeClient } from '../services/realtimeClient';

const INTERVAL_MS = 5000;

/**
 * Envía ubicación GPS cada 5s mientras el conductor tiene sesión activa.
 */
export function useDriverGpsTracking(driverId: string | null, activeTripId: string | null) {
  useEffect(() => {
    if (!driverId || useMockApi()) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const send = async () => {
      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        realtimeClient.sendDriverLocationUpdate({
          driverId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          speed:
            position.coords.speed != null && position.coords.speed >= 0
              ? position.coords.speed
              : undefined,
          heading:
            position.coords.heading != null && position.coords.heading >= 0
              ? position.coords.heading
              : undefined,
          tripId: activeTripId ?? undefined,
        });
      } catch {
        /* permisos o GPS no disponible */
      }
    };

    void Location.requestForegroundPermissionsAsync().then(
      ({ status }: { status: Location.PermissionStatus }) => {
      if (status !== 'granted' || cancelled) return;
      void realtimeClient.connect();
      void send();
      timer = setInterval(() => void send(), INTERVAL_MS);
    }
    );

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [driverId, activeTripId]);
}
