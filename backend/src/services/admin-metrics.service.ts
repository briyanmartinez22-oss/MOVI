import { prisma } from '../lib/prisma';

const MONTHLY_SUBSCRIPTION_USD = 7;

const ACTIVE_TRIP_STATUSES = [
  'accepted',
  'driver_arriving',
  'driver_arrived',
  'trip_started',
] as const;

export async function getMetricsSummary() {
  const [
    totalPassengers,
    totalDrivers,
    driversPending,
    driversVerified,
    driversSuspended,
    ownersPending,
    vehiclesPending,
    tripsRequested,
    tripsActive,
    tripsCompleted,
    tripsCancelled,
    totalOffers,
    driversOnline,
    subscriptionsActive,
    subscriptionsExpired,
    avgDriverRatingAgg,
    avgPassengerRatingAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'passenger' } }),
    prisma.driver.count(),
    prisma.driver.count({ where: { status: 'pending' } }),
    prisma.driver.count({ where: { status: 'approved' } }),
    prisma.driver.count({ where: { status: 'suspended' } }),
    prisma.owner.count({ where: { status: { not: 'approved' } } }),
    prisma.vehicle.count({ where: { status: { not: 'approved' } } }),
    prisma.trip.count(),
    prisma.trip.count({
      where: { lifecycleStatus: { in: [...ACTIVE_TRIP_STATUSES] } },
    }),
    prisma.trip.count({ where: { lifecycleStatus: 'trip_completed' } }),
    prisma.trip.count({ where: { lifecycleStatus: 'cancelled' } }),
    prisma.tripOffer.count(),
    prisma.driverSession.count({ where: { disconnectedAt: null } }),
    prisma.driverSubscription.count({ where: { status: 'active' } }),
    prisma.driverSubscription.count({
      where: { status: { in: ['past_due', 'suspended'] } },
    }),
    prisma.tripRating.aggregate({
      where: { rateeRole: 'driver' },
      _avg: { stars: true },
      _count: { _all: true },
    }),
    prisma.tripRating.aggregate({
      where: { rateeRole: 'passenger' },
      _avg: { stars: true },
      _count: { _all: true },
    }),
  ]);

  const providersPendingVerification =
    driversPending + ownersPending + vehiclesPending;

  return {
    totalPassengers,
    totalProviders: totalDrivers,
    providersPendingVerification,
    providersVerified: driversVerified,
    providersSuspended: driversSuspended,
    tripsRequested,
    tripsActive,
    tripsCompleted,
    tripsCancelled,
    totalOffers,
    avgProviderRating: avgDriverRatingAgg._avg.stars ?? 0,
    avgProviderRatingCount: avgDriverRatingAgg._count._all,
    avgPassengerRating: avgPassengerRatingAgg._avg.stars ?? 0,
    avgPassengerRatingCount: avgPassengerRatingAgg._count._all,
    driversOnline,
    subscriptionsActive,
    subscriptionsExpired,
    projectedMonthlyRevenueUsd: subscriptionsActive * MONTHLY_SUBSCRIPTION_USD,
    monthlySubscriptionFeeUsd: MONTHLY_SUBSCRIPTION_USD,
  };
}

export async function getMetricsProviders() {
  const [byDriverStatus, byOwnerStatus, byVehicleStatus, totalOwners, totalVehicles] =
    await Promise.all([
      prisma.driver.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.owner.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.vehicle.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.owner.count(),
      prisma.vehicle.count(),
    ]);

  return {
    totalDrivers: byDriverStatus.reduce((sum, row) => sum + row._count._all, 0),
    totalOwners,
    totalVehicles,
    driversByStatus: Object.fromEntries(
      byDriverStatus.map((row) => [row.status, row._count._all])
    ),
    ownersByStatus: Object.fromEntries(
      byOwnerStatus.map((row) => [row.status, row._count._all])
    ),
    vehiclesByStatus: Object.fromEntries(
      byVehicleStatus.map((row) => [row.status, row._count._all])
    ),
    driversOnline: await prisma.driverSession.count({
      where: { disconnectedAt: null },
    }),
  };
}

export async function getMetricsTrips() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    byLifecycle,
    tripsToday,
    tripsWeek,
    tripsMonth,
    pendingRequests,
    offersToday,
    offersTotal,
  ] = await Promise.all([
    prisma.trip.groupBy({ by: ['lifecycleStatus'], _count: { _all: true } }),
    prisma.trip.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.trip.count({ where: { createdAt: { gte: startOfWeek } } }),
    prisma.trip.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.trip.count({
      where: { lifecycleStatus: { in: ['requested', 'offered'] } },
    }),
    prisma.tripOffer.count({ where: { createdAt: { gte: startOfDay } } }),
    prisma.tripOffer.count(),
  ]);

  const lifecycleMap = Object.fromEntries(
    byLifecycle.map((row) => [row.lifecycleStatus, row._count._all])
  );

  return {
    byLifecycle: lifecycleMap,
    tripsToday,
    tripsWeek,
    tripsMonth,
    pendingRequests,
    tripsActive: ACTIVE_TRIP_STATUSES.reduce(
      (sum, status) => sum + (lifecycleMap[status] ?? 0),
      0
    ),
    tripsCompleted: lifecycleMap.trip_completed ?? 0,
    tripsCancelled: lifecycleMap.cancelled ?? 0,
    offersToday,
    offersTotal,
  };
}

export async function getMetricsRatings() {
  const [driverRatings, passengerRatings, recentRatings] = await Promise.all([
    prisma.tripRating.aggregate({
      where: { rateeRole: 'driver' },
      _avg: { stars: true },
      _count: { _all: true },
      _min: { stars: true },
      _max: { stars: true },
    }),
    prisma.tripRating.aggregate({
      where: { rateeRole: 'passenger' },
      _avg: { stars: true },
      _count: { _all: true },
      _min: { stars: true },
      _max: { stars: true },
    }),
    prisma.tripRating.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tripId: true,
        raterRole: true,
        rateeRole: true,
        stars: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    providers: {
      average: driverRatings._avg.stars ?? 0,
      count: driverRatings._count._all,
      min: driverRatings._min.stars ?? 0,
      max: driverRatings._max.stars ?? 0,
    },
    passengers: {
      average: passengerRatings._avg.stars ?? 0,
      count: passengerRatings._count._all,
      min: passengerRatings._min.stars ?? 0,
      max: passengerRatings._max.stars ?? 0,
    },
    recent: recentRatings.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function getMetricsSubscriptions() {
  const [byStatus, subscriptions] = await Promise.all([
    prisma.driverSubscription.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.driverSubscription.findMany({
      select: {
        driverId: true,
        status: true,
        monthlyAmountUsd: true,
        trialEndsAt: true,
        nextBillingAt: true,
        lastPaidAt: true,
      },
    }),
  ]);

  const statusMap = Object.fromEntries(
    byStatus.map((row) => [row.status, row._count._all])
  );
  const activeCount = statusMap.active ?? 0;

  return {
    byStatus: statusMap,
    total: subscriptions.length,
    active: activeCount,
    trial: statusMap.trial_until_next_month ?? 0,
    pastDue: statusMap.past_due ?? 0,
    suspended: statusMap.suspended ?? 0,
    expired: (statusMap.past_due ?? 0) + (statusMap.suspended ?? 0),
    projectedMonthlyRevenueUsd: activeCount * MONTHLY_SUBSCRIPTION_USD,
    monthlyFeeUsd: MONTHLY_SUBSCRIPTION_USD,
  };
}

export async function getMetricsRecentActivity() {
  const [recentTrips, recentDrivers, recentOffers] = await Promise.all([
    prisma.trip.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        passengerName: true,
        lifecycleStatus: true,
        createdAt: true,
      },
    }),
    prisma.driver.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.tripOffer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        tripId: true,
        driverName: true,
        price: true,
        status: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    trips: recentTrips.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    })),
    driverRegistrations: recentDrivers.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
    offers: recentOffers.map((o) => ({
      ...o,
      createdAt: o.createdAt.toISOString(),
    })),
  };
}
