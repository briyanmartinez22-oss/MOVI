import type { ChatMessage, ServiceType, Trip, TripLifecycleStatus, TripOffer, VehicleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJsonField, stringifyJsonField } from '../utils/normalize';
import { notifyUser, TRIP_PUSH_EVENTS } from './notification.service';
import {
  assertProviderCanOffer,
  findEligibleProviders,
  isSchedulableVehicleType,
  normalizeVehicleType,
} from './providerEligibility.service';
import { canDriverOperate } from './subscription.service';

export const MIN_OFFER_PRICE = 0.5;
export const OFFER_PRICE_STEP = 0.5;

type SerializedTripOffer = {
  id: string;
  driverId: string;
  driver: Awaited<ReturnType<typeof buildDriverProfile>>;
  price: number;
  etaMinutes: number;
  status: string;
  createdAt: number;
};

type DriverIdRow = { id: string };

export interface PlaceInput {
  id: string;
  name: string;
  coordinates: { latitude: number; longitude: number };
}

const LIFECYCLE_ORDER: TripLifecycleStatus[] = [
  'requested',
  'offered',
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
  'trip_completed',
];

function lifecycleToStatus(lifecycle: TripLifecycleStatus): string {
  switch (lifecycle) {
    case 'requested':
      return 'searching';
    case 'offered':
      return 'offers';
    case 'accepted':
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
      return 'idle';
  }
}

function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function buildDriverProfile(driverId: string) {
  const driver = await prisma.driver.findUnique({
    where: { id: driverId },
    include: { vehicle: true },
  });
  if (!driver) return null;

  const lastPing = await prisma.locationPing.findFirst({
    where: { driverId },
    orderBy: { createdAt: 'desc' },
  });
  const coords = lastPing
    ? { latitude: lastPing.latitude, longitude: lastPing.longitude }
    : { latitude: 13.6929, longitude: -89.2182 };

  return {
    id: driver.id,
    name: driver.name,
    unit: `Unidad #${driver.vehicle.unitNumber}`,
    plate: driver.vehicle.plateNumber,
    association: driver.vehicle.associationName,
    rating: driver.rating,
    vehicleType: driver.vehicle.vehicleType,
    coordinates: coords,
  };
}

async function isTripParticipant(tripId: string, userId: string): Promise<boolean> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return false;
  if (trip.passengerId === userId) return true;
  if (!trip.driverId) return false;
  const driver = await prisma.driver.findUnique({ where: { id: trip.driverId } });
  return driver?.userId === userId;
}

export async function serializeTrip(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { offers: { orderBy: { createdAt: 'asc' } } },
  });
  if (!trip) return null;

  const offers = await Promise.all(
    trip.offers.map(async (offer: TripOffer) => {
      const driver = await buildDriverProfile(offer.driverId);
      return {
        id: offer.id,
        driverId: offer.driverId,
        driver,
        price: offer.price,
        etaMinutes: offer.etaMinutes,
        status: offer.status,
        createdAt: offer.createdAt.getTime(),
      };
    })
  );

  const acceptedOffer = trip.acceptedOfferId
    ? offers.find((o: SerializedTripOffer) => o.id === trip.acceptedOfferId) ?? null
    : null;

  return {
    id: trip.id,
    kind: trip.kind,
    deliveryCategory: trip.deliveryCategory ?? undefined,
    businessId: trip.businessId ?? undefined,
    businessName: trip.businessName ?? undefined,
    passengerId: trip.passengerId,
    passengerName: trip.passengerName,
    origin: parseJsonField<PlaceInput>(trip.originJson, {
      id: 'origin',
      name: '',
      coordinates: { latitude: 0, longitude: 0 },
    }),
    destination: parseJsonField<PlaceInput>(trip.destinationJson, {
      id: 'destination',
      name: '',
      coordinates: { latitude: 0, longitude: 0 },
    }),
    tripType: trip.tripType,
    distanceKm: trip.distanceKm,
    status: trip.status,
    lifecycleStatus: trip.lifecycleStatus,
    offers,
    acceptedOffer,
    passengerCount: trip.passengerCount,
    passengerOfferPrice: trip.passengerOfferPrice ?? undefined,
    description: trip.description,
    photoUris: parseJsonField<string[]>(trip.photoUrisJson, []),
    serviceType: trip.serviceType ?? undefined,
    cargoDetails: parseJsonField(trip.cargoDetailsJson, {}),
    requestType: trip.requestType ?? undefined,
    requestMode: trip.requestMode,
    scheduledAt: trip.scheduledAt?.getTime(),
    offerDeadlineAt: trip.offerDeadlineAt?.getTime(),
    requiredVehicleType: trip.requiredVehicleType ?? undefined,
    scheduledStatus: trip.scheduledStatus ?? undefined,
    pickupLatitude: trip.pickupLatitude ?? undefined,
    pickupLongitude: trip.pickupLongitude ?? undefined,
    driverLocation:
      trip.driverLat != null && trip.driverLng != null
        ? { latitude: trip.driverLat, longitude: trip.driverLng }
        : undefined,
    createdAt: trip.createdAt.getTime(),
    startedAt: trip.startedAt?.getTime(),
    completedAt: trip.completedAt?.getTime(),
    cancelledAt: trip.cancelledAt?.getTime(),
    cancelledBy: trip.cancelledBy ?? undefined,
  };
}

export async function createTripRequest(
  passengerId: string,
  passengerName: string,
  data: {
    origin: PlaceInput;
    destination: PlaceInput;
    tripType: string;
    kind?: string;
    passengerCount?: number;
    description?: string;
    photoUris?: string[];
    serviceType?: string;
    requestType?: string;
    deliveryCategory?: string;
    businessId?: string;
    businessName?: string;
    passengerOfferPrice?: number;
    cargoDetails?: Record<string, unknown>;
    requestMode?: 'NOW' | 'SCHEDULED';
    scheduledAt?: string | Date;
    offerDeadlineAt?: string | Date;
    requiredVehicleType?: string;
  }
): Promise<
  | { ok: true; trip: Awaited<ReturnType<typeof serializeTrip>> }
  | { ok: false; error: string }
> {
  const requestMode = data.requestMode ?? 'NOW';
  const requiredVehicleType = normalizeVehicleType(data.requiredVehicleType ?? 'mototaxi');

  if (requestMode === 'SCHEDULED') {
    if (!isSchedulableVehicleType(requiredVehicleType)) {
      return {
        ok: false,
        error: 'Solo microbús, pickup y camión admiten solicitudes programadas.',
      };
    }
    if (!data.scheduledAt) {
      return { ok: false, error: 'scheduledAt es obligatorio para solicitudes programadas.' };
    }
    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return { ok: false, error: 'La fecha programada debe ser futura.' };
    }
  }

  const distanceKm = haversineKm(data.origin.coordinates, data.destination.coordinates);
  const serviceType = mapServiceType(data.serviceType);
  const scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : undefined;
  const offerDeadlineAt = data.offerDeadlineAt ? new Date(data.offerDeadlineAt) : undefined;

  const trip = await prisma.trip.create({
    data: {
      passengerId,
      passengerName,
      originJson: stringifyJsonField(data.origin),
      destinationJson: stringifyJsonField(data.destination),
      tripType: data.tripType,
      kind: data.kind ?? 'ride',
      distanceKm,
      status: requestMode === 'SCHEDULED' ? 'searching' : 'searching',
      lifecycleStatus: 'requested',
      passengerCount: Math.max(1, data.passengerCount ?? 1),
      description: data.description?.trim() || 'Viaje MOVI',
      photoUrisJson: stringifyJsonField(data.photoUris ?? []),
      serviceType,
      cargoDetailsJson: stringifyJsonField(data.cargoDetails ?? {}),
      requestType: data.requestType,
      deliveryCategory: data.deliveryCategory,
      businessId: data.businessId,
      businessName: data.businessName,
      passengerOfferPrice: data.passengerOfferPrice,
      requestMode,
      scheduledAt,
      offerDeadlineAt,
      pickupLatitude: data.origin.coordinates.latitude,
      pickupLongitude: data.origin.coordinates.longitude,
      requiredVehicleType: requiredVehicleType as VehicleType,
      scheduledStatus: requestMode === 'SCHEDULED' ? 'open' : null,
    },
  });

  if (serviceType && ['DELIVERY', 'PACKAGE', 'CARGO', 'BUSINESS_SERVICE'].includes(serviceType)) {
    await prisma.delivery.create({
      data: {
        tripId: trip.id,
        packageCount: 1,
        weightKg: typeof data.cargoDetails?.weightKg === 'number' ? data.cargoDetails.weightKg : undefined,
      },
    });
  }

  void notifyEligibleDriversNewRequest(trip.id, passengerName).catch(() => undefined);

  const serialized = await serializeTrip(trip.id);
  if (!serialized) return { ok: false, error: 'No se pudo serializar el viaje.' };
  return { ok: true, trip: serialized };
}

async function notifyEligibleDriversNewRequest(tripId: string, passengerName: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return;

  const eligible = await findEligibleProviders(trip);
  await Promise.all(
    eligible.map(({ userId }) =>
      notifyUser(
        userId,
        'trip_update',
        trip.requestMode === 'SCHEDULED' ? 'Nueva reserva programada' : 'Nueva solicitud',
        `${passengerName} solicita un servicio${trip.requestMode === 'SCHEDULED' ? ' programado' : ' cerca de ti'}.`,
        TRIP_PUSH_EVENTS.tripRequest,
        { tripId }
      )
    )
  );
}

function mapServiceType(value?: string): ServiceType | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase().replace(/-/g, '_');
  const allowed: ServiceType[] = [
    'RIDE', 'DELIVERY', 'PACKAGE', 'CARGO', 'MOVING',
    'ANIMAL_TRANSPORT', 'GROUP_TRANSPORT', 'BUSINESS_SERVICE',
  ];
  return allowed.includes(upper as ServiceType) ? (upper as ServiceType) : undefined;
}

export async function getTripById(tripId: string) {
  return serializeTrip(tripId);
}

export async function createTripOffer(
  tripId: string,
  driverUserId: string,
  data: { price: number; etaMinutes?: number }
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };
  if (trip.lifecycleStatus === 'cancelled' || trip.lifecycleStatus === 'trip_completed') {
    return { ok: false as const, error: 'El viaje ya no acepta ofertas.' };
  }

  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    include: { vehicle: true },
  });
  if (!driver || driver.status !== 'approved') {
    return { ok: false as const, error: 'Conductor no autorizado.' };
  }

  const eligibility = await assertProviderCanOffer(trip, driver);
  if (!eligibility.ok) {
    return { ok: false as const, error: eligibility.error };
  }

  const subCheck = await canDriverOperate(driver.id);
  if (!subCheck.ok) {
    return { ok: false as const, error: subCheck.reason ?? 'Suscripción vencida.' };
  }

  if (data.price < MIN_OFFER_PRICE) {
    return { ok: false as const, error: `Precio mínimo $${MIN_OFFER_PRICE.toFixed(2)}` };
  }
  if (data.price % OFFER_PRICE_STEP !== 0) {
    return { ok: false as const, error: `Incrementos de $${OFFER_PRICE_STEP.toFixed(2)}` };
  }

  const existing = await prisma.tripOffer.findFirst({
    where: { tripId, driverId: driver.id, status: 'pending' },
  });
  if (existing) {
    return { ok: false as const, error: 'Ya enviaste una oferta para este viaje.' };
  }

  const origin = parseJsonField<PlaceInput>(trip.originJson, {
    id: 'origin',
    name: '',
    coordinates: { latitude: 0, longitude: 0 },
  });
  const etaMinutes =
    data.etaMinutes ??
    Math.max(3, Math.round(haversineKm(origin.coordinates, { latitude: 13.6929, longitude: -89.2182 }) * 4));

  const offer = await prisma.tripOffer.create({
    data: {
      tripId,
      driverId: driver.id,
      vehicleId: driver.vehicleId,
      driverName: driver.name,
      price: data.price,
      etaMinutes,
    },
  });

  if (trip.lifecycleStatus === 'requested') {
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        lifecycleStatus: 'offered',
        status: lifecycleToStatus('offered'),
      },
    });
  }

  const serialized = await serializeTrip(tripId);
  void notifyUser(
    trip.passengerId,
    'offer_received',
    'Nueva oferta',
    `${driver.name} envió una oferta de $${data.price.toFixed(2)}.`,
    TRIP_PUSH_EVENTS.offerCreated,
    { tripId, offerId: offer.id }
  ).catch(() => undefined);
  return { ok: true as const, offer, trip: serialized };
}

export async function acceptTripOffer(tripId: string, offerId: string, passengerUserId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };
  if (trip.passengerId !== passengerUserId) {
    return { ok: false as const, error: 'Solo el pasajero puede aceptar ofertas.' };
  }

  const offer = await prisma.tripOffer.findUnique({ where: { id: offerId } });
  if (!offer || offer.tripId !== tripId) {
    return { ok: false as const, error: 'Oferta no encontrada' };
  }
  if (offer.status !== 'pending') {
    return { ok: false as const, error: 'La oferta ya no está disponible.' };
  }

  if (trip.scheduledStatus === 'confirmed') {
    return { ok: false as const, error: 'La reserva programada ya fue confirmada.' };
  }

  await prisma.tripOffer.updateMany({
    where: { tripId, id: { not: offerId }, status: 'pending' },
    data: { status: trip.requestMode === 'SCHEDULED' ? 'not_selected' : 'rejected' },
  });

  await prisma.tripOffer.update({
    where: { id: offerId },
    data: { status: 'accepted' },
  });

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      acceptedOfferId: offerId,
      driverId: offer.driverId,
      lifecycleStatus: 'accepted',
      status: lifecycleToStatus('accepted'),
      scheduledStatus: trip.requestMode === 'SCHEDULED' ? 'confirmed' : trip.scheduledStatus,
    },
  });

  const serialized = await serializeTrip(tripId);
  const driverUser = await prisma.driver.findUnique({
    where: { id: offer.driverId },
    select: { userId: true, name: true },
  });
  if (driverUser?.userId) {
    void notifyUser(
      driverUser.userId,
      'trip_update',
      'Oferta aceptada',
      'Tu oferta fue aceptada. Dirígete al punto de recogida.',
      TRIP_PUSH_EVENTS.tripAccepted,
      { tripId, offerId }
    ).catch(() => undefined);
  }
  void notifyUser(
    trip.passengerId,
    'trip_update',
    'Conductor asignado',
    `${driverUser?.name ?? 'Tu conductor'} va en camino hacia ti.`,
    TRIP_PUSH_EVENTS.tripAccepted,
    { tripId, offerId }
  ).catch(() => undefined);
  return { ok: true as const, trip: serialized };
}

export async function advanceTripLifecycle(tripId: string, lifecycleStatus: TripLifecycleStatus, userId: string) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };

  const driver = trip.driverId
    ? await prisma.driver.findUnique({ where: { id: trip.driverId } })
    : null;

  const isPassenger = trip.passengerId === userId;
  const isDriver = driver?.userId === userId;
  if (!isPassenger && !isDriver) {
    return { ok: false as const, error: 'No autorizado para actualizar este viaje.' };
  }

  const currentIdx = LIFECYCLE_ORDER.indexOf(trip.lifecycleStatus);
  const nextIdx = LIFECYCLE_ORDER.indexOf(lifecycleStatus);
  if (nextIdx < 0) return { ok: false as const, error: 'Estado inválido.' };
  if (lifecycleStatus !== 'cancelled' && nextIdx <= currentIdx) {
    return { ok: false as const, error: 'Transición de estado inválida.' };
  }

  const updates: {
    lifecycleStatus: TripLifecycleStatus;
    status: string;
    startedAt?: Date;
    completedAt?: Date;
  } = {
    lifecycleStatus,
    status: lifecycleToStatus(lifecycleStatus),
  };

  if (lifecycleStatus === 'trip_started' && !trip.startedAt) {
    updates.startedAt = new Date();
  }
  if (lifecycleStatus === 'trip_completed') {
    updates.completedAt = new Date();
    await persistTripHistory(tripId);
    if (trip.driverId) {
      await prisma.driver.update({
        where: { id: trip.driverId },
        data: { totalTrips: { increment: 1 } },
      });
    }
  }

  await prisma.trip.update({ where: { id: tripId }, data: updates });
  const serialized = await serializeTrip(tripId);
  void dispatchLifecyclePush(trip, lifecycleStatus, driver?.userId).catch(() => undefined);
  return { ok: true as const, trip: serialized };
}

async function dispatchLifecyclePush(
  trip: Trip,
  lifecycleStatus: TripLifecycleStatus,
  driverUserId?: string
) {
  if (lifecycleStatus === 'driver_arriving') {
    await notifyUser(
      trip.passengerId,
      'trip_update',
      'Conductor en camino',
      'Tu conductor se dirige al punto de recogida.',
      TRIP_PUSH_EVENTS.driverArriving,
      { tripId: trip.id }
    );
  }
  if (lifecycleStatus === 'driver_arrived' && driverUserId) {
    await notifyUser(
      trip.passengerId,
      'trip_update',
      'Conductor llegó',
      'Tu conductor está en el punto de recogida.',
      TRIP_PUSH_EVENTS.driverArrived,
      { tripId: trip.id }
    );
  }
  if (lifecycleStatus === 'trip_started') {
    await notifyUser(
      trip.passengerId,
      'trip_update',
      'Servicio iniciado',
      'Tu viaje ha comenzado.',
      TRIP_PUSH_EVENTS.tripStarted,
      { tripId: trip.id }
    );
  }
  if (lifecycleStatus === 'trip_completed') {
    await notifyUser(
      trip.passengerId,
      'trip_update',
      'Servicio completado',
      'Califica tu experiencia en MOVI.',
      TRIP_PUSH_EVENTS.tripCompleted,
      { tripId: trip.id }
    );
    if (driverUserId) {
      await notifyUser(
        driverUserId,
        'trip_update',
        'Servicio completado',
        'El viaje finalizó correctamente.',
        TRIP_PUSH_EVENTS.tripCompleted,
        { tripId: trip.id }
      );
    }
  }
}

export async function cancelTrip(
  tripId: string,
  userId: string,
  by?: 'passenger' | 'driver'
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };
  if (trip.lifecycleStatus === 'trip_completed' || trip.lifecycleStatus === 'cancelled') {
    return { ok: false as const, error: 'El viaje ya finalizó.' };
  }

  const driver = trip.driverId
    ? await prisma.driver.findUnique({ where: { id: trip.driverId } })
    : null;

  const isPassenger = trip.passengerId === userId;
  const isDriver = driver?.userId === userId;
  if (!isPassenger && !isDriver) {
    return { ok: false as const, error: 'No autorizado.' };
  }

  const cancelledBy: 'passenger' | 'driver' = isPassenger ? 'passenger' : 'driver';
  if (by && by !== cancelledBy) {
    return { ok: false as const, error: 'No autorizado para cancelar como este rol.' };
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: {
      lifecycleStatus: 'cancelled',
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy,
    },
  });

  await prisma.tripOffer.updateMany({
    where: { tripId, status: { in: ['pending', 'accepted'] } },
    data: { status: 'expired' },
  });

  const serialized = await serializeTrip(tripId);

  const passengerMessage =
    cancelledBy === 'passenger'
      ? 'Cancelaste el viaje.'
      : 'El conductor canceló el viaje.';
  const driverMessage =
    cancelledBy === 'driver'
      ? 'Cancelaste el viaje.'
      : 'El pasajero canceló el viaje.';

  void notifyUser(
    trip.passengerId,
    'trip_update',
    'Viaje cancelado',
    passengerMessage,
    TRIP_PUSH_EVENTS.tripCancelled,
    { tripId, cancelledBy }
  ).catch(() => undefined);

  if (driver?.userId) {
    void notifyUser(
      driver.userId,
      'trip_update',
      'Viaje cancelado',
      driverMessage,
      TRIP_PUSH_EVENTS.tripCancelled,
      { tripId, cancelledBy }
    ).catch(() => undefined);
  }

  return { ok: true as const, trip: serialized };
}

export async function updateDriverLocation(tripId: string, driverUserId: string, lat: number, lng: number) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip || !trip.driverId) return { ok: false as const, error: 'Viaje no encontrado' };

  const driver = await prisma.driver.findUnique({ where: { id: trip.driverId } });
  if (!driver || driver.userId !== driverUserId) {
    return { ok: false as const, error: 'No autorizado.' };
  }

  await prisma.trip.update({
    where: { id: tripId },
    data: { driverLat: lat, driverLng: lng },
  });

  return { ok: true as const, location: { latitude: lat, longitude: lng } };
}

export async function addChatMessage(
  tripId: string,
  senderId: string,
  senderRole: string,
  senderName: string,
  text: string
) {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };

  const allowed = await isTripParticipant(tripId, senderId);
  if (!allowed) return { ok: false as const, error: 'No autorizado para este chat.' };

  const message = await prisma.chatMessage.create({
    data: { tripId, senderId, senderRole, senderName, text },
  });

  const recipientId =
    senderId === trip.passengerId
      ? (await prisma.driver.findUnique({ where: { id: trip.driverId ?? '__none__' } }))?.userId
      : trip.passengerId;
  if (recipientId) {
    void notifyUser(
      recipientId,
      'trip_update',
      'Nuevo mensaje',
      `${senderName}: ${text.slice(0, 80)}`,
      TRIP_PUSH_EVENTS.newMessage,
      { tripId }
    ).catch(() => undefined);
  }

  return {
    ok: true as const,
    message: {
      id: message.id,
      tripId: message.tripId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      senderName: message.senderName,
      text: message.text,
      createdAt: message.createdAt.getTime(),
    },
  };
}

export async function getTripHistory(userId: string, role: string) {
  const where =
    role === 'driver'
      ? { driverId: (await prisma.driver.findUnique({ where: { userId } }))?.id ?? '__none__' }
      : role === 'owner'
        ? {
            driverId: {
              in: (
                await prisma.driver.findMany({
                  where: { owner: { userId } },
                  select: { id: true },
                })
              ).map((d: DriverIdRow) => d.id),
            },
          }
        : { passengerId: userId };

  const trips = await prisma.trip.findMany({
    where: {
      ...where,
      lifecycleStatus: { in: ['trip_completed', 'cancelled'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return Promise.all(trips.map((t: Trip) => serializeTrip(t.id)));
}

export async function getAvailableTripsForDriver(driverUserId: string) {
  return getNearbyTripsForDriver(driverUserId);
}

export async function getNearbyTripsForDriver(driverUserId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    include: { vehicle: true },
  });
  if (!driver) return [];

  const trips = await prisma.trip.findMany({
    where: {
      requestMode: 'NOW',
      lifecycleStatus: { in: ['requested', 'offered'] },
      status: { in: ['searching', 'offers'] },
      passengerId: { not: driverUserId },
      scheduledStatus: null,
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
  });

  const available = [];
  for (const trip of trips) {
    const eligible = await findEligibleProviders(trip);
    if (!eligible.some((e) => e.driverId === driver.id)) continue;

    const existing = await prisma.tripOffer.findFirst({
      where: { tripId: trip.id, driverId: driver.id, status: 'pending' },
    });
    if (existing) continue;

    const serialized = await serializeTrip(trip.id);
    if (serialized) available.push(serialized);
  }
  return available;
}

export async function getScheduledTripsForDriver(driverUserId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    include: { vehicle: true },
  });
  if (!driver) return [];

  const trips = await prisma.trip.findMany({
    where: {
      requestMode: 'SCHEDULED',
      scheduledStatus: 'open',
      lifecycleStatus: { in: ['requested', 'offered'] },
      passengerId: { not: driverUserId },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 30,
  });

  const available = [];
  for (const trip of trips) {
    const eligible = await findEligibleProviders(trip);
    if (!eligible.some((e) => e.driverId === driver.id)) continue;

    const existing = await prisma.tripOffer.findFirst({
      where: { tripId: trip.id, driverId: driver.id, status: 'pending' },
    });
    if (existing) continue;

    const serialized = await serializeTrip(trip.id);
    if (serialized) available.push(serialized);
  }
  return available;
}

export async function getDriverReservations(driverUserId: string) {
  const driver = await prisma.driver.findUnique({ where: { userId: driverUserId } });
  if (!driver) return [];

  const trips = await prisma.trip.findMany({
    where: {
      requestMode: 'SCHEDULED',
      scheduledStatus: 'confirmed',
      driverId: driver.id,
      lifecycleStatus: { in: ['accepted', 'driver_arriving', 'driver_arrived', 'trip_started'] },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 30,
  });

  const reservations = [];
  for (const trip of trips) {
    const serialized = await serializeTrip(trip.id);
    if (serialized) reservations.push(serialized);
  }
  return reservations;
}

/** @deprecated use getNearbyTripsForDriver via findEligibleProviders */
export async function getEligibleDriverUserIds(): Promise<string[]> {
  const activeSessions = await prisma.driverSession.findMany({
    where: { disconnectedAt: null },
    include: {
      driver: {
        include: { vehicle: true },
      },
    },
  });

  const userIds: string[] = [];
  for (const session of activeSessions) {
    const driver = session.driver;
    if (!driver || driver.status !== 'approved') continue;
    if (!driver.vehicle || driver.vehicle.status !== 'approved') continue;
    const subCheck = await canDriverOperate(driver.id);
    if (!subCheck.ok) continue;
    userIds.push(driver.userId);
  }
  return [...new Set(userIds)];
}

export async function getChatMessages(tripId: string, userId?: string) {
  if (userId) {
    const allowed = await isTripParticipant(tripId, userId);
    if (!allowed) return [];
  }

  const messages = await prisma.chatMessage.findMany({
    where: { tripId },
    orderBy: { createdAt: 'asc' },
    take: 200,
  });
  return messages.map((m: ChatMessage) => ({
    id: m.id,
    tripId: m.tripId,
    senderId: m.senderId,
    senderRole: m.senderRole,
    senderName: m.senderName,
    text: m.text,
    createdAt: m.createdAt.getTime(),
  }));
}

export async function completeTripRecord(tripId: string) {
  await persistTripHistory(tripId);
  const trip = await serializeTrip(tripId);
  return trip;
}

async function persistTripHistory(tripId: string) {
  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { offers: true },
  });
  if (!trip || !trip.driverId) return;

  const origin = parseJsonField<PlaceInput>(trip.originJson, {
    id: 'origin',
    name: '',
    coordinates: { latitude: 0, longitude: 0 },
  });
  const destination = parseJsonField<PlaceInput>(trip.destinationJson, {
    id: 'destination',
    name: '',
    coordinates: { latitude: 0, longitude: 0 },
  });

  const accepted = trip.offers.find((o: TripOffer) => o.id === trip.acceptedOfferId);
  const started = trip.startedAt ?? trip.createdAt;
  const completed = trip.completedAt ?? new Date();
  const durationMinutes = Math.max(1, Math.round((completed.getTime() - started.getTime()) / 60000));

  await prisma.tripHistory.create({
    data: {
      tripId: trip.id,
      passengerId: trip.passengerId,
      passengerName: trip.passengerName,
      driverId: trip.driverId,
      driverName: accepted?.driverName ?? 'Conductor',
      originName: origin.name,
      destinationName: destination.name,
      distanceKm: trip.distanceKm,
      price: accepted?.price ?? 0,
      durationMinutes,
      status: 'trip_completed',
      completedAt: completed,
    },
  });
}
