import type { Driver, Trip, Vehicle, VehicleType } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { haversineKm } from './mapsProvider';
import { canDriverOperate } from './subscription.service';

export const SCHEDULABLE_VEHICLE_TYPES = ['microbus', 'pickup', 'camion'] as const;
export type SchedulableVehicleType = (typeof SCHEDULABLE_VEHICLE_TYPES)[number];

const VEHICLE_RADIUS_KM: Record<string, number> = {
  mototaxi: 5,
  tuk_tuk_red: 5,
  qute: 5,
  motocicleta: 7,
  sedan: 8,
  pickup: 12,
  camioneta: 12,
  camion: 20,
  microbus: 15,
};

const VEHICLE_COMPATIBILITY: Record<string, VehicleType[]> = {
  mototaxi: ['mototaxi', 'qute', 'tuk_tuk_red', 'motocicleta'],
  motocicleta: ['motocicleta', 'mototaxi', 'qute'],
  qute: ['qute', 'mototaxi', 'tuk_tuk_red'],
  sedan: ['sedan'],
  pickup: ['pickup', 'camioneta'],
  camioneta: ['camioneta', 'pickup'],
  camion: ['camion'],
  microbus: ['microbus'],
  tuk_tuk_red: ['tuk_tuk_red', 'mototaxi', 'qute'],
};

export function normalizeVehicleType(type?: VehicleType | string | null): VehicleType {
  if (!type || type === 'tuk_tuk_red') return 'mototaxi';
  return type as VehicleType;
}

export function isSchedulableVehicleType(type?: VehicleType | string | null): boolean {
  const normalized = normalizeVehicleType(type);
  return SCHEDULABLE_VEHICLE_TYPES.includes(normalized as SchedulableVehicleType);
}

export function getRadiusKmForVehicle(vehicleType: VehicleType | string): number {
  const key = normalizeVehicleType(vehicleType);
  return VEHICLE_RADIUS_KM[key] ?? 8;
}

export function isProviderVehicleCompatible(
  requiredType: VehicleType | string,
  providerType: VehicleType | string
): boolean {
  const required = normalizeVehicleType(requiredType);
  const provider = normalizeVehicleType(providerType);
  const allowed = VEHICLE_COMPATIBILITY[required] ?? [required];
  return allowed.includes(provider);
}

export type EligibleProvider = {
  driverId: string;
  userId: string;
  vehicleType: VehicleType;
  distanceKm?: number;
};

export async function getDriverLastLocation(
  driverId: string
): Promise<{ latitude: number; longitude: number } | null> {
  const ping = await prisma.locationPing.findFirst({
    where: { driverId },
    orderBy: { createdAt: 'desc' },
  });
  if (ping) return { latitude: ping.latitude, longitude: ping.longitude };
  return null;
}

export async function recordDriverLocation(
  driverId: string,
  userId: string,
  latitude: number,
  longitude: number
) {
  return prisma.locationPing.create({
    data: { driverId, userId, latitude, longitude, source: 'driver_session' },
  });
}

function getTripPickup(trip: Trip): { latitude: number; longitude: number } | null {
  if (trip.pickupLatitude != null && trip.pickupLongitude != null) {
    return { latitude: trip.pickupLatitude, longitude: trip.pickupLongitude };
  }
  return null;
}

async function isDriverEligibleBase(
  driver: Driver & { vehicle: Vehicle | null }
): Promise<{ ok: boolean; reason?: string }> {
  if (driver.status !== 'approved') {
    return { ok: false, reason: 'Conductor no verificado.' };
  }
  if (!driver.vehicle || driver.vehicle.status !== 'approved') {
    return { ok: false, reason: 'Vehículo no verificado.' };
  }
  const subCheck = await canDriverOperate(driver.id);
  if (!subCheck.ok) {
    return { ok: false, reason: subCheck.reason ?? 'Suscripción no activa.' };
  }
  return { ok: true };
}

export async function findEligibleProviders(trip: Trip): Promise<EligibleProvider[]> {
  const requiredType = normalizeVehicleType(trip.requiredVehicleType ?? 'mototaxi');
  const pickup = getTripPickup(trip);

  if (trip.requestMode === 'SCHEDULED') {
    if (!isSchedulableVehicleType(requiredType)) return [];
    if (trip.scheduledStatus === 'confirmed') return [];

    const drivers = await prisma.driver.findMany({
      where: { status: 'approved', vehicle: { status: 'approved' } },
      include: { vehicle: true },
    });

    const eligible: EligibleProvider[] = [];
    for (const driver of drivers) {
      const base = await isDriverEligibleBase(driver);
      if (!base.ok || !driver.vehicle) continue;
      if (!isProviderVehicleCompatible(requiredType, driver.vehicle.vehicleType)) continue;
      eligible.push({
        driverId: driver.id,
        userId: driver.userId,
        vehicleType: driver.vehicle.vehicleType,
      });
    }
    return eligible;
  }

  if (!pickup) return [];

  const sessions = await prisma.driverSession.findMany({
    where: { disconnectedAt: null },
    include: { driver: { include: { vehicle: true } } },
  });

  const eligible: EligibleProvider[] = [];
  for (const session of sessions) {
    const driver = session.driver;
    if (!driver?.vehicle) continue;

    const base = await isDriverEligibleBase(driver);
    if (!base.ok) continue;
    if (!isProviderVehicleCompatible(requiredType, driver.vehicle.vehicleType)) continue;

    const location = await getDriverLastLocation(driver.id);
    if (!location) continue;

    const distanceKm = haversineKm(pickup, location);
    const radiusKm = getRadiusKmForVehicle(driver.vehicle.vehicleType);
    if (distanceKm > radiusKm) continue;

    eligible.push({
      driverId: driver.id,
      userId: driver.userId,
      vehicleType: driver.vehicle.vehicleType,
      distanceKm,
    });
  }

  return eligible;
}

export async function assertProviderCanOffer(
  trip: Trip,
  driver: Driver & { vehicle: Vehicle | null }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const requiredType = normalizeVehicleType(trip.requiredVehicleType ?? 'mototaxi');

  if (trip.requestMode === 'SCHEDULED') {
    if (!isSchedulableVehicleType(requiredType)) {
      return { ok: false, error: 'Este tipo de vehículo no admite solicitudes programadas.' };
    }
    if (trip.scheduledStatus === 'confirmed') {
      return { ok: false, error: 'La reserva programada ya fue confirmada.' };
    }
    if (trip.scheduledAt && trip.scheduledAt <= new Date()) {
      return { ok: false, error: 'La fecha programada ya pasó.' };
    }
  }

  const base = await isDriverEligibleBase(driver);
  if (!base.ok) return { ok: false, error: base.reason ?? 'Proveedor no elegible.' };

  if (!driver.vehicle) {
    return { ok: false, error: 'Vehículo no disponible.' };
  }

  if (!isProviderVehicleCompatible(requiredType, driver.vehicle.vehicleType)) {
    return { ok: false, error: 'Vehículo incompatible con esta solicitud.' };
  }

  if (trip.requestMode === 'NOW') {
    const activeSession = await prisma.driverSession.findFirst({
      where: { driverId: driver.id, disconnectedAt: null },
    });
    if (!activeSession) {
      return { ok: false, error: 'Debes estar online para ofertar solicitudes inmediatas.' };
    }

    const pickup = getTripPickup(trip);
    const location = await getDriverLastLocation(driver.id);
    if (!pickup || !location) {
      return {
        ok: false,
        error: 'Proveedor fuera del radio permitido para esta solicitud inmediata.',
      };
    }

    const distanceKm = haversineKm(pickup, location);
    const radiusKm = getRadiusKmForVehicle(driver.vehicle.vehicleType);
    if (distanceKm > radiusKm) {
      return {
        ok: false,
        error: 'Proveedor fuera del radio permitido para esta solicitud inmediata.',
      };
    }
  }

  return { ok: true };
}

export async function isDriverEligibleForTrip(
  tripId: string,
  driverUserId: string
): Promise<boolean> {
  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return false;

  const driver = await prisma.driver.findUnique({
    where: { userId: driverUserId },
    include: { vehicle: true },
  });
  if (!driver) return false;

  const check = await assertProviderCanOffer(trip, driver);
  return check.ok;
}
