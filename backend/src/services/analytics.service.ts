import type { DriverSubscription } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJsonField } from '../utils/normalize';
import {
  mapDriverMvpStatus,
  mapOwnerMvpStatus,
  mapVehicleMvpStatus,
} from '../utils/verification-status';
import { getDriverLicenseUrls } from '../utils/driver-license-docs';

type CountAggregate = { _count: { _all: number } };
type VehicleTypeGroup = CountAggregate & { vehicleType: string };
type RequestTypeGroup = CountAggregate & { requestType: string | null };
type DeliveryCategoryGroup = CountAggregate & { deliveryCategory: string | null };

const VEHICLE_TYPE_LABELS: Record<string, string> = {
  mototaxi: 'Mototaxi',
  qute: 'Qute',
  motocicleta: 'Motocicleta',
  sedan: 'Sedán',
  camioneta: 'Camioneta',
  pickup: 'Pickup',
  camion: 'Camión',
  microbus: 'Microbús',
};

export async function getAdminKpis() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalUsers,
    totalDrivers,
    totalOwners,
    totalBusiness,
    totalVehicles,
    tripsToday,
    deliveriesToday,
    activeDrivers,
    expiredDrivers,
    subscriptions,
    tripsByVehicle,
    deliveriesByCategory,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: 'driver' } }),
    prisma.user.count({ where: { role: 'owner' } }),
    prisma.user.count({ where: { role: 'business' } }),
    prisma.vehicle.count(),
    prisma.trip.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.delivery.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.driverSession.count({ where: { disconnectedAt: null } }),
    prisma.driverSubscription.count({
      where: { status: { in: ['past_due', 'suspended'] } },
    }),
    prisma.driverSubscription.findMany(),
    prisma.trip.groupBy({
      by: ['requestType'],
      _count: { _all: true },
      where: { lifecycleStatus: 'trip_completed' },
    }),
    prisma.trip.groupBy({
      by: ['deliveryCategory'],
      _count: { _all: true },
      where: { kind: { not: 'ride' }, lifecycleStatus: 'trip_completed' },
    }),
  ]);

  const mrr = subscriptions.filter((s: DriverSubscription) => s.status === 'active').length * 7;
  const arr = mrr * 12;

  const vehicleBreakdown = await prisma.vehicle.groupBy({
    by: ['vehicleType'],
    _count: { _all: true },
  });

  return {
    totals: {
      users: totalUsers,
      drivers: totalDrivers,
      owners: totalOwners,
      business: totalBusiness,
      vehicles: totalVehicles,
    },
    operations: {
      tripsToday,
      deliveriesToday,
      activeDrivers,
      expiredDrivers,
    },
    revenue: {
      mrr,
      arr,
      subscriptionCount: subscriptions.length,
    },
    tripsByVehicleType: vehicleBreakdown.map((v: VehicleTypeGroup) => ({
      vehicleType: VEHICLE_TYPE_LABELS[v.vehicleType] ?? v.vehicleType,
      count: v._count._all,
    })),
    tripsByRequestType: tripsByVehicle.map((t: RequestTypeGroup) => ({
      type: t.requestType ?? 'ride',
      count: t._count._all,
    })),
    deliveriesByCategory: deliveriesByCategory.map((d: DeliveryCategoryGroup) => ({
      category: d.deliveryCategory ?? 'general',
      count: d._count._all,
    })),
    hotspots: [],
  };
}

export async function listPendingVerifications() {
  const [owners, vehicles, driversRaw] = await Promise.all([
    prisma.owner.findMany({
      where: { status: 'under_review', deletedAt: null },
      include: { user: { select: { profilePhoto: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.vehicle.findMany({
      where: { status: 'under_review', deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.driver.findMany({
      where: { status: 'pending', deletedAt: null },
      include: { vehicle: true, user: { select: { profilePhoto: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);

  const drivers: Array<(typeof driversRaw)[number] & {
    licenseFront?: string;
    licenseBack?: string;
  }> = [];
  for (const driver of driversRaw) {
    const licenseUrls = await getDriverLicenseUrls(driver.id);
    if (!licenseUrls.licenseFront?.trim() || !licenseUrls.licenseBack?.trim()) continue;
    drivers.push({
      ...driver,
      licenseFront: licenseUrls.licenseFront,
      licenseBack: licenseUrls.licenseBack,
    });
  }

  console.log('[MOVI_ADMIN_DEBUG]', {
    ownersSubmitted: owners.length,
    vehiclesSubmitted: vehicles.length,
    driversSubmitted: drivers.length,
    driversPendingTotal: driversRaw.length,
  });

  return {
    owners: owners.map((o) => {
      const documents = parseJsonField<Record<string, string>>(o.documentsJson, {});
      return {
        id: o.id,
        userId: o.userId,
        name: o.name,
        phone: o.phone,
        dui: o.dui,
        documentType: o.documentType,
        status: o.status,
        mvpStatus: mapOwnerMvpStatus(o.status),
        documents,
        duiFront: documents.duiFront,
        duiBack: documents.duiBack,
        licenseFront: documents.licenseFront,
        licenseBack: documents.licenseBack,
        profilePhoto: o.user.profilePhoto ?? documents.selfie,
        createdAt: o.createdAt.toISOString(),
      };
    }),
    vehicles: vehicles.map((v) => ({
      vehicleId: v.id,
      unitNumber: v.unitNumber,
      plateNumber: v.plateNumber,
      vehicleType: v.vehicleType,
      ownerId: v.ownerId,
      status: v.status,
      mvpStatus: mapVehicleMvpStatus(v.status),
      documents: parseJsonField(v.documentsJson, {}),
      createdAt: v.createdAt.toISOString(),
    })),
    drivers: drivers.map((d) => ({
      id: d.id,
      userId: d.userId,
      ownerId: d.ownerId,
      vehicleId: d.vehicleId,
      name: d.name,
      phone: d.phone,
      status: d.status,
      mvpStatus: mapDriverMvpStatus(d.status),
      unitNumber: d.vehicle.unitNumber,
      plateNumber: d.vehicle.plateNumber,
      profilePhoto: d.user.profilePhoto ?? undefined,
      licenseFront: d.licenseFront,
      licenseBack: d.licenseBack,
      createdAt: d.createdAt.toISOString(),
    })),
  };
}
