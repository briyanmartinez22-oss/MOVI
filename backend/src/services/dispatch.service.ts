import type { TripLifecycleStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJsonField } from '../utils/normalize';
import { haversineKm, estimateEtaMinutes } from '../utils/geo';
import { serializeTrip } from './tripService';
import { notifyUser, TRIP_PUSH_EVENTS } from './notification.service';
import { writeAdminAudit } from './audit.service';

const ACTIVE_TRIP_STATUSES: TripLifecycleStatus[] = [
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
];

const DISPATCHABLE_STATUSES: TripLifecycleStatus[] = ['requested', 'offered'];

function lifecycleToStatus(lifecycle: TripLifecycleStatus): string {
  switch (lifecycle) {
    case 'requested':
      return 'searching';
    case 'offered':
      return 'offers';
    case 'accepted':
      return 'assigned';
    case 'driver_arriving':
    case 'driver_arrived':
      return 'assigned';
    case 'trip_started':
      return 'in_progress';
    default:
      return 'searching';
  }
}

type PlaceCoords = { latitude: number; longitude: number };

export async function getDispatchCandidates(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return [];

  const origin = parseJsonField<{ coordinates?: PlaceCoords }>(trip.originJson, {});
  const pickupLat = trip.pickupLatitude ?? origin.coordinates?.latitude;
  const pickupLng = trip.pickupLongitude ?? origin.coordinates?.longitude;

  const sessions = await prisma.driverSession.findMany({
    where: { disconnectedAt: null },
    include: {
      driver: { include: { vehicle: true } },
    },
    take: 100,
  });

  const busyDriverIds = new Set(
    (
      await prisma.trip.findMany({
        where: {
          lifecycleStatus: { in: ACTIVE_TRIP_STATUSES },
          driverId: { not: null },
          id: { not: tripId },
        },
        select: { driverId: true },
      })
    ).map((t) => t.driverId!)
  );

  return sessions
    .filter((s) => s.driver.status === 'approved')
    .map((s) => {
      const busy = busyDriverIds.has(s.driverId);
      let distanceKm: number | null = null;
      let etaMinutes: number | null = null;

      const lat = s.lastLatitude;
      const lng = s.lastLongitude;
      if (pickupLat != null && pickupLng != null && lat != null && lng != null) {
        distanceKm = Math.round(haversineKm(lat, lng, pickupLat, pickupLng) * 10) / 10;
        etaMinutes = estimateEtaMinutes(distanceKm);
      }

      return {
        driverId: s.driverId,
        name: s.driver.name,
        rating: s.driver.rating,
        vehicleType: s.driver.vehicle?.vehicleType ?? null,
        unitNumber: s.driver.vehicle?.unitNumber ?? null,
        plateNumber: s.driver.vehicle?.plateNumber ?? null,
        busy,
        distanceKm,
        etaMinutes,
        latitude: lat,
        longitude: lng,
        speed: s.lastSpeed,
        locationUpdatedAt: s.locationUpdatedAt?.toISOString() ?? null,
      };
    })
    .sort((a, b) => {
      if (a.busy !== b.busy) return a.busy ? 1 : -1;
      return (a.distanceKm ?? 999) - (b.distanceKm ?? 999);
    });
}

export async function adminDispatchTrip(
  tripId: string,
  driverId: string,
  adminUserId: string,
  actorRole?: string
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };
  if (!DISPATCHABLE_STATUSES.includes(trip.lifecycleStatus)) {
    return { ok: false as const, error: 'El viaje no está pendiente de asignación.' };
  }
  if (trip.driverId) {
    return { ok: false as const, error: 'El viaje ya tiene conductor asignado.' };
  }

  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { vehicle: true },
  });
  if (!driver || driver.status !== 'approved') {
    return { ok: false as const, error: 'Conductor no válido.' };
  }

  const session = await prisma.driverSession.findFirst({
    where: { driverId, disconnectedAt: null },
  });
  if (!session) {
    return { ok: false as const, error: 'Conductor no está online.' };
  }

  const busyTrip = await prisma.trip.findFirst({
    where: {
      driverId,
      lifecycleStatus: { in: ACTIVE_TRIP_STATUSES },
    },
  });
  if (busyTrip) {
    return { ok: false as const, error: 'Conductor ocupado con otro viaje.' };
  }

  const before = { lifecycleStatus: trip.lifecycleStatus, driverId: trip.driverId };

  await prisma.tripOffer.updateMany({
    where: { tripId, status: { in: ['pending', 'accepted'] } },
    data: { status: 'expired' },
  });

  const price =
    trip.passengerOfferPrice ??
    (await prisma.tripOffer.findFirst({
      where: { tripId },
      orderBy: { createdAt: 'desc' },
      select: { price: true },
    }))?.price ??
    5;

  const offer = await prisma.tripOffer.create({
    data: {
      tripId,
      driverId,
      vehicleId: driver.vehicle?.id,
      driverName: driver.name,
      price,
      etaMinutes: 10,
      status: 'accepted',
    },
  });

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      driverId,
      acceptedOfferId: offer.id,
      lifecycleStatus: 'accepted',
      status: lifecycleToStatus('accepted'),
    },
  });

  const serialized = await serializeTrip(tripId);

  void notifyUser(
    driver.userId,
    'trip_update',
    'Viaje asignado por operaciones',
    'Un administrador te asignó un viaje. Dirígete al punto de recogida.',
    TRIP_PUSH_EVENTS.tripAccepted,
    { tripId, offerId: offer.id, source: 'admin_dispatch' }
  ).catch(() => undefined);

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'dispatch',
    entityType: 'admin_dispatch_trip',
    entityId: tripId,
    before,
    after: { driverId, offerId: offer.id, lifecycleStatus: 'accepted' },
    changes: { driverId, dispatchedBy: adminUserId },
  });

  return { ok: true as const, trip: serialized };
}
