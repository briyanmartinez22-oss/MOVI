import type { TripLifecycleStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { serializeTrip } from './tripService';

const ACTIVE_TRIP_STATUSES: TripLifecycleStatus[] = [
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
];

const PENDING_STATUSES: TripLifecycleStatus[] = ['requested', 'offered'];

const SLA_WAIT_MINUTES = 5;
const NO_MATCH_MINUTES = 3;

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
    case 'trip_completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'searching';
  }
}

export async function getOperationsLiveSnapshot() {
  const [driversOnline, activeTrips, pendingTrips, driversBusy] = await Promise.all([
    prisma.driverSession.count({ where: { disconnectedAt: null } }),
    prisma.trip.count({
      where: { lifecycleStatus: { in: ACTIVE_TRIP_STATUSES } },
    }),
    prisma.trip.count({
      where: { lifecycleStatus: { in: PENDING_STATUSES } },
    }),
    prisma.trip.count({
      where: {
        lifecycleStatus: { in: ACTIVE_TRIP_STATUSES },
        driverId: { not: null },
      },
    }),
  ]);

  const pendingTripRows = await prisma.trip.findMany({
    where: { lifecycleStatus: { in: PENDING_STATUSES } },
    select: { createdAt: true },
  });

  const now = Date.now();
  const waitMinutes =
    pendingTripRows.length > 0
      ? pendingTripRows.reduce(
          (sum, row) => sum + (now - row.createdAt.getTime()) / 60000,
          0
        ) / pendingTripRows.length
      : 0;

  return {
    driversOnline,
    driversBusy,
    activeTrips,
    pendingTrips,
    avgWaitMinutes: Math.round(waitMinutes * 10) / 10,
    slaWaitMinutes: SLA_WAIT_MINUTES,
    noMatchMinutes: NO_MATCH_MINUTES,
  };
}

export async function getLiveDrivers() {
  const sessions = await prisma.driverSession.findMany({
    where: { disconnectedAt: null },
    include: {
      driver: {
        include: { vehicle: true },
      },
    },
    orderBy: { connectedAt: 'desc' },
    take: 200,
  });

  const driverIds = sessions.map((s) => s.driverId);
  if (driverIds.length === 0) return [];

  const activeTrips = await prisma.trip.findMany({
    where: {
      driverId: { in: driverIds },
      lifecycleStatus: { in: ACTIVE_TRIP_STATUSES },
    },
    select: {
      id: true,
      driverId: true,
      driverLat: true,
      driverLng: true,
      lifecycleStatus: true,
    },
  });

  const activeTripByDriver = new Map(
    activeTrips.map((t) => [t.driverId!, t])
  );

  const pings = await prisma.locationPing.findMany({
    where: { driverId: { in: driverIds } },
    orderBy: { createdAt: 'desc' },
    take: driverIds.length * 3,
  });

  const latestPingByDriver = new Map<string, { latitude: number; longitude: number }>();
  for (const ping of pings) {
    if (!ping.driverId || latestPingByDriver.has(ping.driverId)) continue;
    latestPingByDriver.set(ping.driverId, {
      latitude: ping.latitude,
      longitude: ping.longitude,
    });
  }

  return sessions.map((session) => {
    const activeTrip = activeTripByDriver.get(session.driverId);
    const busy = Boolean(activeTrip);

    let latitude: number | null = session.lastLatitude ?? null;
    let longitude: number | null = session.lastLongitude ?? null;

    if (activeTrip?.driverLat != null && activeTrip.driverLng != null) {
      latitude = activeTrip.driverLat;
      longitude = activeTrip.driverLng;
    } else if (latitude == null || longitude == null) {
      const ping = latestPingByDriver.get(session.driverId);
      if (ping) {
        latitude = ping.latitude;
        longitude = ping.longitude;
      }
    }

    return {
      driverId: session.driverId,
      sessionId: session.sessionId,
      name: session.driver.name,
      vehicleType: session.driver.vehicle?.vehicleType ?? null,
      unitNumber: session.driver.vehicle?.unitNumber ?? null,
      plateNumber: session.driver.vehicle?.plateNumber ?? null,
      busy,
      activeTripId: activeTrip?.id ?? null,
      activeTripStatus: activeTrip?.lifecycleStatus ?? null,
      latitude,
      longitude,
      speed: session.lastSpeed ?? null,
      heading: session.lastHeading ?? null,
      locationUpdatedAt: session.locationUpdatedAt?.toISOString() ?? null,
      connectedAt: session.connectedAt.toISOString(),
    };
  });
}

export async function getLiveTrips() {
  const trips = await prisma.trip.findMany({
    where: {
      lifecycleStatus: {
        in: [...ACTIVE_TRIP_STATUSES, ...PENDING_STATUSES],
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  const serialized = await Promise.all(trips.map((t) => serializeTrip(t.id)));
  return serialized.filter(Boolean);
}

export async function getOperationsAlerts() {
  const now = Date.now();
  const slaThreshold = new Date(now - SLA_WAIT_MINUTES * 60 * 1000);
  const noMatchThreshold = new Date(now - NO_MATCH_MINUTES * 60 * 1000);
  const cancellationWindow = new Date(now - 24 * 60 * 60 * 1000);

  const [pendingTrips, recentCancellations] = await Promise.all([
    prisma.trip.findMany({
      where: { lifecycleStatus: { in: PENDING_STATUSES } },
      include: { offers: { select: { id: true, status: true } } },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
    prisma.trip.findMany({
      where: {
        lifecycleStatus: 'cancelled',
        cancelledAt: { gte: cancellationWindow },
      },
      orderBy: { cancelledAt: 'desc' },
      take: 50,
    }),
  ]);

  const alerts: Array<{
    id: string;
    type: 'no_match' | 'cancellation' | 'sla';
    tripId: string;
    passengerName: string;
    message: string;
    severity: 'warning' | 'critical';
    createdAt: string;
  }> = [];

  for (const trip of pendingTrips) {
    const waitMinutes = (now - trip.createdAt.getTime()) / 60000;
    const offerCount = trip.offers.length;
    const hasAccepted = trip.offers.some((o) => o.status === 'accepted');

    if (trip.createdAt <= noMatchThreshold && offerCount === 0) {
      alerts.push({
        id: `no-match-${trip.id}`,
        type: 'no_match',
        tripId: trip.id,
        passengerName: trip.passengerName,
        message: `Sin ofertas tras ${Math.round(waitMinutes)} min`,
        severity: 'critical',
        createdAt: trip.createdAt.toISOString(),
      });
    } else if (
      trip.lifecycleStatus === 'offered' &&
      trip.createdAt <= noMatchThreshold &&
      !hasAccepted
    ) {
      alerts.push({
        id: `no-match-offers-${trip.id}`,
        type: 'no_match',
        tripId: trip.id,
        passengerName: trip.passengerName,
        message: `Ofertas sin aceptar tras ${Math.round(waitMinutes)} min`,
        severity: 'warning',
        createdAt: trip.createdAt.toISOString(),
      });
    }

    if (trip.createdAt <= slaThreshold) {
      alerts.push({
        id: `sla-${trip.id}`,
        type: 'sla',
        tripId: trip.id,
        passengerName: trip.passengerName,
        message: `Espera > ${SLA_WAIT_MINUTES} min (${Math.round(waitMinutes)} min)`,
        severity: waitMinutes >= SLA_WAIT_MINUTES * 2 ? 'critical' : 'warning',
        createdAt: trip.createdAt.toISOString(),
      });
    }
  }

  for (const trip of recentCancellations) {
    alerts.push({
      id: `cancel-${trip.id}`,
      type: 'cancellation',
      tripId: trip.id,
      passengerName: trip.passengerName,
      message: `Cancelado por ${trip.cancelledBy ?? 'desconocido'}`,
      severity: 'warning',
      createdAt: (trip.cancelledAt ?? trip.createdAt).toISOString(),
    });
  }

  return alerts.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getAdminTripDetail(tripId: string) {
  return serializeTrip(tripId);
}

export async function adminCancelTrip(tripId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };
  if (trip.lifecycleStatus === 'trip_completed' || trip.lifecycleStatus === 'cancelled') {
    return { ok: false as const, error: 'El viaje ya finalizó.' };
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      lifecycleStatus: 'cancelled',
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: 'admin',
    },
  });

  await prisma.tripOffer.updateMany({
    where: { tripId, status: { in: ['pending', 'accepted'] } },
    data: { status: 'expired' },
  });

  const serialized = await serializeTrip(tripId);
  return { ok: true as const, trip: serialized };
}

export async function adminReassignDriver(tripId: string, newDriverId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };
  if (trip.lifecycleStatus === 'trip_completed' || trip.lifecycleStatus === 'cancelled') {
    return { ok: false as const, error: 'El viaje ya finalizó.' };
  }
  if (trip.lifecycleStatus === 'trip_started') {
    return { ok: false as const, error: 'No se puede reasignar un viaje en curso.' };
  }

  const newDriver = await prisma.driver.findUnique({
    where: { id: newDriverId },
    include: { vehicle: true },
  });
  if (!newDriver || newDriver.status !== 'approved') {
    return { ok: false as const, error: 'Conductor no válido o no aprobado.' };
  }

  const activeSession = await prisma.driverSession.findFirst({
    where: { driverId: newDriverId, disconnectedAt: null },
  });
  if (!activeSession) {
    return { ok: false as const, error: 'El conductor no está online.' };
  }

  const busyTrip = await prisma.trip.findFirst({
    where: {
      driverId: newDriverId,
      lifecycleStatus: { in: ACTIVE_TRIP_STATUSES },
      id: { not: tripId },
    },
  });
  if (busyTrip) {
    return { ok: false as const, error: 'El conductor ya tiene un viaje activo.' };
  }

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
      driverId: newDriverId,
      vehicleId: newDriver.vehicle?.id,
      driverName: newDriver.name,
      price,
      etaMinutes: 10,
      status: 'accepted',
    },
  });

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      driverId: newDriverId,
      acceptedOfferId: offer.id,
      lifecycleStatus: 'accepted',
      status: lifecycleToStatus('accepted'),
    },
  });

  const serialized = await serializeTrip(tripId);
  return { ok: true as const, trip: serialized };
}

export async function getAvailableDriversForReassign(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    select: { id: true },
  });
  if (!trip) return [];

  const sessions = await prisma.driverSession.findMany({
    where: { disconnectedAt: null },
    include: {
      driver: {
        include: { vehicle: true },
      },
    },
    take: 100,
  });

  const busyDriverIds = await prisma.trip.findMany({
    where: {
      lifecycleStatus: { in: ACTIVE_TRIP_STATUSES },
      driverId: { not: null },
      id: { not: tripId },
    },
    select: { driverId: true },
  });

  const busySet = new Set(busyDriverIds.map((t) => t.driverId!));

  return sessions
    .filter(
      (s) =>
        s.driver.status === 'approved' &&
        !busySet.has(s.driverId)
    )
    .map((s) => ({
      driverId: s.driverId,
      name: s.driver.name,
      vehicleType: s.driver.vehicle?.vehicleType ?? null,
      unitNumber: s.driver.vehicle?.unitNumber ?? null,
      plateNumber: s.driver.vehicle?.plateNumber ?? null,
    }));
}
