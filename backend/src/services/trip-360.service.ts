import { prisma } from '../lib/prisma';
import { parseJsonField } from '../utils/normalize';
import { getTripRatings } from './rating.service';
import { serializeTrip } from './tripService';

const TIMELINE_STEPS = [
  'requested',
  'offered',
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
  'trip_completed',
  'cancelled',
] as const;

export async function getAdminTrip360(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: {
      offers: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!trip) return null;

  const serialized = await serializeTrip(tripId);
  if (!serialized) return null;

  let driver = null;
  let vehicle = null;
  if (trip.driverId) {
    const d = await prisma.driver.findUnique({
      where: { id: trip.driverId },
      include: { vehicle: true, user: true },
    });
    if (d) {
      driver = {
        id: d.id,
        name: d.name,
        phone: d.phone,
        rating: d.rating,
        userId: d.userId,
      };
      if (d.vehicle) {
        vehicle = {
          unitNumber: d.vehicle.unitNumber,
          plateNumber: d.vehicle.plateNumber,
          vehicleType: d.vehicle.vehicleType,
        };
      }
    }
  }

  const passenger = await prisma.user.findUnique({
    where: { id: trip.passengerId },
    select: { id: true, fullName: true, phoneNumber: true },
  });

  const timeline = TIMELINE_STEPS.map((step) => {
    let at: string | null = null;
    if (step === 'requested') at = trip.createdAt.toISOString();
    if (step === 'trip_started' && trip.startedAt) at = trip.startedAt.toISOString();
    if (step === 'trip_completed' && trip.completedAt) at = trip.completedAt.toISOString();
    if (step === 'cancelled' && trip.cancelledAt) at = trip.cancelledAt.toISOString();
    if (step === 'accepted' && trip.acceptedOfferId) {
      const offer = trip.offers.find((o) => o.id === trip.acceptedOfferId);
      if (offer) at = offer.createdAt.toISOString();
    }
    const reached =
      TIMELINE_STEPS.indexOf(step as typeof TIMELINE_STEPS[number]) <=
      TIMELINE_STEPS.indexOf(trip.lifecycleStatus as typeof TIMELINE_STEPS[number]);
    return { step, reached, at };
  });

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: tripId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const notifications = await prisma.notification.findMany({
    where: {
      userId: { in: [trip.passengerId, driver?.userId ?? '__none__'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const otpLogs = passenger
    ? await prisma.otpChallenge.findMany({
        where: { phoneNumber: passenger.phoneNumber },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, verified: true, createdAt: true },
      })
    : [];

  const liveSession = trip.driverId
    ? await prisma.driverSession.findFirst({
        where: { driverId: trip.driverId, disconnectedAt: null },
        select: {
          lastLatitude: true,
          lastLongitude: true,
          lastSpeed: true,
          locationUpdatedAt: true,
        },
      })
    : null;

  const tripRatings = await getTripRatings(tripId);

  return {
    trip: serialized,
    passenger,
    driver,
    vehicle,
    price: serialized.acceptedOffer?.price ?? trip.passengerOfferPrice,
    timeline,
    ratings: tripRatings,
    logs: {
      audit: auditLogs.map((l) => ({
        id: l.id,
        action: l.action,
        actorRole: l.actorRole,
        userId: l.userId,
        createdAt: l.createdAt.toISOString(),
        changes: parseJsonField(l.changesJson, {}),
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        createdAt: n.createdAt.toISOString(),
      })),
      otp: otpLogs.map((o) => ({
        id: o.id,
        verified: o.verified,
        createdAt: o.createdAt.toISOString(),
      })),
    },
    liveDriver: liveSession
      ? {
          latitude: liveSession.lastLatitude,
          longitude: liveSession.lastLongitude,
          speed: liveSession.lastSpeed,
          locationUpdatedAt: liveSession.locationUpdatedAt?.toISOString(),
        }
      : null,
  };
}
