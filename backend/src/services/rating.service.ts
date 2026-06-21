import { prisma } from '../lib/prisma';

export async function submitTripRating(
  tripId: string,
  raterUserId: string,
  data: { stars: number; comment?: string; raterRole: 'passenger' | 'driver' }
) {
  if (data.stars < 1 || data.stars > 5) {
    return { ok: false as const, error: 'Calificación entre 1 y 5 estrellas.' };
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return { ok: false as const, error: 'Viaje no encontrado' };
  if (trip.lifecycleStatus !== 'trip_completed') {
    return { ok: false as const, error: 'Solo se puede calificar viajes completados.' };
  }

  const driver = trip.driverId
    ? await prisma.driver.findUnique({ where: { id: trip.driverId } })
    : null;

  let rateeId: string;
  let rateeRole: string;

  if (data.raterRole === 'passenger') {
    if (trip.passengerId !== raterUserId) {
      return { ok: false as const, error: 'Solo el pasajero puede calificar al conductor.' };
    }
    if (!driver) return { ok: false as const, error: 'Conductor no asignado.' };
    rateeId = driver.userId;
    rateeRole = 'driver';
  } else {
    if (!driver || driver.userId !== raterUserId) {
      return { ok: false as const, error: 'Solo el conductor puede calificar al pasajero.' };
    }
    rateeId = trip.passengerId;
    rateeRole = 'passenger';
  }

  const existing = await prisma.tripRating.findUnique({
    where: { tripId_raterId_raterRole: { tripId, raterId: raterUserId, raterRole: data.raterRole } },
  });
  if (existing) return { ok: false as const, error: 'Ya calificaste este viaje.' };

  const rating = await prisma.tripRating.create({
    data: {
      tripId,
      raterId: raterUserId,
      raterRole: data.raterRole,
      rateeId,
      rateeRole,
      stars: data.stars,
      comment: data.comment?.trim() || null,
    },
  });

  if (rateeRole === 'driver' && driver) {
    const allRatings = await prisma.tripRating.findMany({
      where: { rateeId: driver.userId, rateeRole: 'driver' },
    });
    const avg = allRatings.reduce((sum, r) => sum + r.stars, 0) / allRatings.length;
    await prisma.driver.update({
      where: { id: driver.id },
      data: { rating: Math.round(avg * 10) / 10 },
    });
  }

  return {
    ok: true as const,
    rating: {
      id: rating.id,
      tripId: rating.tripId,
      raterId: rating.raterId,
      raterRole: rating.raterRole,
      rateeId: rating.rateeId,
      rateeRole: rating.rateeRole,
      stars: rating.stars,
      comment: rating.comment ?? undefined,
      createdAt: rating.createdAt.toISOString(),
    },
  };
}

export async function getTripRatings(tripId: string) {
  const ratings = await prisma.tripRating.findMany({
    where: { tripId },
    orderBy: { createdAt: 'asc' },
  });
  return ratings.map((r) => ({
    id: r.id,
    tripId: r.tripId,
    raterId: r.raterId,
    raterRole: r.raterRole,
    rateeId: r.rateeId,
    rateeRole: r.rateeRole,
    stars: r.stars,
    comment: r.comment ?? undefined,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getUserRatings(userId: string) {
  const ratings = await prisma.tripRating.findMany({
    where: { rateeId: userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const count = ratings.length;
  const average =
    count > 0 ? Math.round((ratings.reduce((s, r) => s + r.stars, 0) / count) * 10) / 10 : 0;
  return {
    average,
    count,
    ratings: ratings.map((r) => ({
      id: r.id,
      tripId: r.tripId,
      raterId: r.raterId,
      raterRole: r.raterRole,
      rateeId: r.rateeId,
      rateeRole: r.rateeRole,
      stars: r.stars,
      comment: r.comment ?? undefined,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}

export async function listAdminRatings(limit = 50) {
  const ratings = await prisma.tripRating.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  const userIds = [...new Set(ratings.flatMap((r) => [r.raterId, r.rateeId]))];
  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, fullName: true, role: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    ratings: ratings.map((r) => ({
      id: r.id,
      tripId: r.tripId,
      raterId: r.raterId,
      raterName: userMap.get(r.raterId)?.fullName ?? r.raterId,
      raterRole: r.raterRole,
      rateeId: r.rateeId,
      rateeName: userMap.get(r.rateeId)?.fullName ?? r.rateeId,
      rateeRole: r.rateeRole,
      stars: r.stars,
      comment: r.comment ?? undefined,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
