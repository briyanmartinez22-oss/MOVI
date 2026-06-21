import type { TripLifecycleStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

const ACTIVE_TRIP_STATUSES: TripLifecycleStatus[] = [
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
];

export type DriverLocationUpdatePayload = {
  driverId: string;
  sessionId: string;
  name: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  locationUpdatedAt: string;
  busy: boolean;
  activeTripId: string | null;
  activeTripStatus: string | null;
  unitNumber: string | null;
  plateNumber: string | null;
  vehicleType: string | null;
};

export async function updateDriverSessionLocation(
  driverUserId: string,
  driverId: string,
  lat: number,
  lng: number,
  options?: { speed?: number; heading?: number; tripId?: string }
): Promise<
  { ok: true; payload: DriverLocationUpdatePayload } | { ok: false; error: string }
> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ok: false, error: 'lat y lng inválidos' };
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { vehicle: true },
  });
  if (!driver || driver.userId !== driverUserId) {
    return { ok: false, error: 'Conductor no válido' };
  }

  const session = await prisma.driverSession.findFirst({
    where: { driverId, disconnectedAt: null },
  });
  if (!session) {
    return { ok: false, error: 'Sin sesión activa' };
  }

  const now = new Date();
  const speed =
    options?.speed != null && Number.isFinite(options.speed) ? options.speed : null;
  const heading =
    options?.heading != null && Number.isFinite(options.heading) ? options.heading : null;

  await prisma.driverSession.update({
    where: { sessionId: session.sessionId },
    data: {
      lastLatitude: lat,
      lastLongitude: lng,
      lastSpeed: speed,
      lastHeading: heading,
      locationUpdatedAt: now,
    },
  });

  await prisma.locationPing.create({
    data: {
      userId: driverUserId,
      driverId,
      tripId: options?.tripId ?? null,
      latitude: lat,
      longitude: lng,
      speed,
      heading,
      source: 'driver_location_update',
    },
  });

  const activeTrip = await prisma.trip.findFirst({
    where: {
      driverId,
      lifecycleStatus: { in: ACTIVE_TRIP_STATUSES },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (activeTrip) {
    await prisma.trip.update({
      where: { id: activeTrip.id },
      data: { driverLat: lat, driverLng: lng },
    });
  }

  const payload: DriverLocationUpdatePayload = {
    driverId,
    sessionId: session.sessionId,
    name: driver.name,
    latitude: lat,
    longitude: lng,
    speed,
    heading,
    locationUpdatedAt: now.toISOString(),
    busy: Boolean(activeTrip),
    activeTripId: activeTrip?.id ?? null,
    activeTripStatus: activeTrip?.lifecycleStatus ?? null,
    unitNumber: driver.vehicle?.unitNumber ?? null,
    plateNumber: driver.vehicle?.plateNumber ?? null,
    vehicleType: driver.vehicle?.vehicleType ?? null,
  };

  return { ok: true, payload };
}
