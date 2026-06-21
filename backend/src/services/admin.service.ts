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

export async function listAdminDrivers() {
  const drivers = await prisma.driver.findMany({
    include: {
      user: true,
      vehicle: true,
      owner: true,
      sessions: { where: { disconnectedAt: null }, take: 1 },
      subscription: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return drivers.map((d) => ({
    id: d.id,
    userId: d.userId,
    name: d.name,
    phone: d.phone,
    status: d.status,
    mvpStatus: mapDriverMvpStatus(d.status),
    rating: d.rating,
    totalTrips: d.totalTrips,
    online: d.sessions.length > 0,
    subscriptionStatus: d.subscription?.status ?? null,
    vehicle: d.vehicle
      ? {
          unitNumber: d.vehicle.unitNumber,
          plateNumber: d.vehicle.plateNumber,
          vehicleType: d.vehicle.vehicleType,
        }
      : null,
    ownerName: d.owner.name,
    phoneVerified: d.user.phoneVerified,
    createdAt: d.createdAt.toISOString(),
  }));
}

export async function listAdminPassengers() {
  const users = await prisma.user.findMany({
    where: { role: 'passenger' },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  const userIds = users.map((u) => u.id);
  const tripStats =
    userIds.length > 0
      ? await prisma.trip.groupBy({
          by: ['passengerId'],
          where: { passengerId: { in: userIds } },
          _count: { id: true },
        })
      : [];
  const completedStats =
    userIds.length > 0
      ? await prisma.trip.groupBy({
          by: ['passengerId'],
          where: {
            passengerId: { in: userIds },
            lifecycleStatus: 'trip_completed',
          },
          _count: { id: true },
        })
      : [];

  const tripCountMap = new Map(tripStats.map((s) => [s.passengerId, s._count.id]));
  const completedMap = new Map(completedStats.map((s) => [s.passengerId, s._count.id]));

  return users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    phoneNumber: u.phoneNumber,
    duiNumber: u.duiNumber,
    phoneVerified: u.phoneVerified,
    accountStatus: u.accountStatus,
    mvpStatus: u.accountStatus === 'suspended' ? 'SUSPENDED' : 'VERIFIED',
    totalTrips: tripCountMap.get(u.id) ?? 0,
    completedTrips: completedMap.get(u.id) ?? 0,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function listAdminRequests() {
  const trips = await prisma.trip.findMany({
    where: { lifecycleStatus: { in: ['requested', 'offered'] } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });
  return Promise.all(trips.map((t) => serializeTrip(t.id)));
}

export async function listAdminOwners() {
  const owners = await prisma.owner.findMany({
    include: { user: true, vehicles: true, drivers: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return owners.map((o) => ({
    id: o.id,
    userId: o.userId,
    name: o.name,
    phone: o.phone,
    dui: o.dui,
    status: o.status,
    mvpStatus: mapOwnerMvpStatus(o.status),
    vehicleCount: o.vehicles.length,
    driverCount: o.drivers.length,
    createdAt: o.createdAt.toISOString(),
  }));
}

export async function listAdminBusinesses() {
  const businesses = await prisma.business.findMany({
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return businesses.map((b) => ({
    id: b.id,
    userId: b.userId,
    businessName: b.businessName,
    businessType: b.businessType,
    businessPhone: b.businessPhone,
    nit: b.nit,
    status: b.status,
    mvpStatus:
      b.status === 'approved'
        ? 'VERIFIED'
        : b.status === 'suspended'
          ? 'SUSPENDED'
          : b.status === 'rejected'
            ? 'REJECTED'
            : 'PENDING',
    rating: b.rating,
    totalDeliveries: b.totalDeliveries,
    addressLabel: b.addressLabel,
    createdAt: b.createdAt.toISOString(),
  }));
}

export async function listAdminDeliveries() {
  const deliveries = await prisma.delivery.findMany({
    include: {
      trip: {
        select: {
          id: true,
          passengerName: true,
          lifecycleStatus: true,
          originJson: true,
          destinationJson: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  return deliveries.map((d) => {
    const origin = parseJsonField<{ name?: string }>(d.trip.originJson, {});
    const destination = parseJsonField<{ name?: string }>(d.trip.destinationJson, {});
    return {
      id: d.id,
      tripId: d.tripId,
      recipientName: d.recipientName,
      recipientPhone: d.recipientPhone,
      packageCount: d.packageCount,
      weightKg: d.weightKg,
      trip: {
        id: d.trip.id,
        passengerName: d.trip.passengerName,
        lifecycleStatus: d.trip.lifecycleStatus,
        originName: origin.name ?? 'Origen',
        destinationName: destination.name ?? 'Destino',
        createdAt: d.trip.createdAt.toISOString(),
      },
      createdAt: d.createdAt.toISOString(),
    };
  });
}

export async function listAdminSubscriptions() {
  const subs = await prisma.driverSubscription.findMany({
    include: {
      driver: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { registeredAt: 'desc' },
    take: 200,
  });
  return subs.map((s) => ({
    id: s.id,
    driverId: s.driverId,
    driverName: s.driver.name,
    driverPhone: s.driver.phone,
    status: s.status,
    monthlyAmountUsd: s.monthlyAmountUsd,
    registeredAt: s.registeredAt.toISOString(),
    nextBillingAt: s.nextBillingAt.toISOString(),
    lastPaidAt: s.lastPaidAt?.toISOString() ?? null,
  }));
}

export async function listAdminStaff() {
  const profiles = await prisma.adminStaffProfile.findMany({
    include: { user: { select: { id: true, fullName: true, phoneNumber: true, role: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return profiles.map((p) => ({
    userId: p.userId,
    staffRole: p.staffRole,
    fullName: p.user.fullName,
    phoneNumber: p.user.phoneNumber,
    createdAt: p.createdAt.toISOString(),
  }));
}
