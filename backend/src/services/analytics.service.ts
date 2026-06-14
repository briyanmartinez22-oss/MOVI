import { prisma } from '../lib/prisma';

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

  const mrr = subscriptions.filter((s) => s.status === 'active').length * 7;
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
    tripsByVehicleType: vehicleBreakdown.map((v) => ({
      vehicleType: VEHICLE_TYPE_LABELS[v.vehicleType] ?? v.vehicleType,
      count: v._count._all,
    })),
    tripsByRequestType: tripsByVehicle.map((t) => ({
      type: t.requestType ?? 'ride',
      count: t._count._all,
    })),
    deliveriesByCategory: deliveriesByCategory.map((d) => ({
      category: d.deliveryCategory ?? 'general',
      count: d._count._all,
    })),
    hotspots: [],
  };
}

export async function listPendingVerifications() {
  const [owners, vehicles, drivers] = await Promise.all([
    prisma.owner.findMany({
      where: { status: { in: ['documents_uploaded', 'under_review', 'selfie_pending'] } },
      include: { user: true },
      take: 100,
    }),
    prisma.vehicle.findMany({
      where: { status: { in: ['documents_uploaded', 'under_review'] } },
      include: { owner: true },
      take: 100,
    }),
    prisma.driver.findMany({
      where: { status: 'pending' },
      include: { owner: true, vehicle: true },
      take: 100,
    }),
  ]);

  return { owners, vehicles, drivers };
}
