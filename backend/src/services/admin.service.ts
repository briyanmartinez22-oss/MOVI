import { prisma } from '../lib/prisma';
import { parseJsonField } from '../utils/normalize';
import {
  mapDriverMvpStatus,
  mapOwnerMvpStatus,
  mapVehicleMvpStatus,
} from '../utils/verification-status';
import { serializeTrip } from './tripService';

export async function listProviders() {
  const owners = await prisma.owner.findMany({
    include: {
      user: true,
      vehicles: { include: { driver: true } },
      drivers: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return owners.map((owner) => ({
    id: owner.id,
    userId: owner.userId,
    name: owner.name,
    phone: owner.phone,
    dui: owner.dui,
    status: owner.status,
    mvpStatus: mapOwnerMvpStatus(owner.status),
    documents: parseJsonField(owner.documentsJson, {}),
    createdAt: owner.createdAt.toISOString(),
    vehicles: owner.vehicles.map((v) => ({
      vehicleId: v.id,
      unitNumber: v.unitNumber,
      plateNumber: v.plateNumber,
      vehicleType: v.vehicleType,
      status: v.status,
      mvpStatus: mapVehicleMvpStatus(v.status),
      documents: parseJsonField(v.documentsJson, {}),
      driver: v.driver
        ? {
            id: v.driver.id,
            name: v.driver.name,
            status: v.driver.status,
            mvpStatus: mapDriverMvpStatus(v.driver.status),
          }
        : null,
    })),
    drivers: owner.drivers.map((d) => ({
      id: d.id,
      name: d.name,
      status: d.status,
      mvpStatus: mapDriverMvpStatus(d.status),
    })),
  }));
}

export async function listAdminTrips(status?: string) {
  const where =
    status && status !== 'all'
      ? { lifecycleStatus: status as never }
      : {};

  const trips = await prisma.trip.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return Promise.all(trips.map((t) => serializeTrip(t.id)));
}

export async function listAdminRequests() {
  const trips = await prisma.trip.findMany({
    where: { lifecycleStatus: { in: ['requested', 'offered'] } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return Promise.all(trips.map((t) => serializeTrip(t.id)));
}
