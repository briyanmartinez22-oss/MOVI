import { prisma } from '../lib/prisma';
import { writeAdminAudit } from './audit.service';

export async function getSecuritySummary() {
  const now = Date.now();
  const dayAgo = new Date(now - 24 * 60 * 60 * 1000);

  const [
    otpFailed,
    suspendedDrivers,
    suspendedOwners,
    sosCount,
    recentAdminActions,
    failedPayments,
  ] = await Promise.all([
    prisma.otpChallenge.count({
      where: { verified: false, createdAt: { gte: dayAgo } },
    }),
    prisma.driver.count({ where: { status: 'suspended' } }),
    prisma.owner.count({ where: { status: 'suspended' } }),
    prisma.notification.count({
      where: { type: 'sos', createdAt: { gte: dayAgo } },
    }),
    prisma.auditLog.count({
      where: { createdAt: { gte: dayAgo }, userId: { not: null } },
    }),
    prisma.payment.count({ where: { status: 'failed', createdAt: { gte: dayAgo } } }),
  ]);

  const highCancelDrivers = await prisma.trip.groupBy({
    by: ['driverId'],
    where: {
      lifecycleStatus: 'cancelled',
      cancelledBy: 'driver',
      cancelledAt: { gte: dayAgo },
      driverId: { not: null },
    },
    _count: { _all: true },
  });

  const suspiciousLogins = await prisma.auditLog.count({
    where: { action: 'login', createdAt: { gte: dayAgo } },
  });

  return {
    otpFailed24h: otpFailed,
    suspiciousLogins24h: suspiciousLogins,
    suspendedUsers: suspendedDrivers + suspendedOwners,
    highCancelDrivers: highCancelDrivers.filter((d) => d._count._all >= 3).length,
    sosActive24h: sosCount,
    failedPayments24h: failedPayments,
    recentAdminActions24h: recentAdminActions,
  };
}

export async function listSecurityEvents(limit = 50) {
  const [audits, otpFails, sos] = await Promise.all([
    prisma.auditLog.findMany({
      where: {
        action: { in: ['login', 'suspend', 'unsuspend', 'cancel', 'dispatch'] },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.otpChallenge.findMany({
      where: { verified: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.notification.findMany({
      where: { type: 'sos' },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
  ]);

  return {
    audits: audits.map((a) => ({
      id: a.id,
      action: a.action,
      userId: a.userId,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt.toISOString(),
    })),
    otpFailures: otpFails.map((o) => ({
      id: o.id,
      phoneNumber: o.phoneNumber,
      createdAt: o.createdAt.toISOString(),
    })),
    sos: sos.map((s) => ({
      id: s.id,
      userId: s.userId,
      title: s.title,
      createdAt: s.createdAt.toISOString(),
    })),
  };
}

export async function suspendUser(
  userId: string,
  adminUserId: string,
  actorRole?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driver: true, owner: true },
  });
  if (!user) return { ok: false as const, error: 'Usuario no encontrado' };

  if (user.driver) {
    await prisma.driver.update({
      where: { id: user.driver.id },
      data: { status: 'suspended' },
    });
  }
  if (user.owner) {
    await prisma.owner.update({
      where: { id: user.owner.id },
      data: { status: 'suspended' },
    });
  }

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'suspend',
    entityType: 'user',
    entityId: userId,
    after: { suspended: true },
  });

  return { ok: true as const };
}

export async function unsuspendUser(
  userId: string,
  adminUserId: string,
  actorRole?: string
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { driver: true, owner: true },
  });
  if (!user) return { ok: false as const, error: 'Usuario no encontrado' };

  if (user.driver) {
    await prisma.driver.update({
      where: { id: user.driver.id },
      data: { status: 'approved' },
    });
  }
  if (user.owner) {
    await prisma.owner.update({
      where: { id: user.owner.id },
      data: { status: 'approved' },
    });
  }

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'unsuspend',
    entityType: 'user',
    entityId: userId,
    after: { suspended: false },
  });

  return { ok: true as const };
}
