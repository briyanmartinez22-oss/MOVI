import { prisma } from '../lib/prisma';
import { writeAdminAudit } from './audit.service';

const MONTHLY_SUBSCRIPTION_USD = 7;

export async function getFinanceSummary() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    revenueToday,
    revenueMonth,
    activeSubscriptions,
    failedPayments,
    refunds,
    paymentsByKind,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { status: 'completed', paidAt: { gte: startOfDay } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'completed', paidAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.driverSubscription.count({ where: { status: 'active' } }),
    prisma.payment.count({
      where: { status: 'failed', createdAt: { gte: startOfMonth } },
    }),
    prisma.payment.count({
      where: { status: 'refunded', refundedAt: { gte: startOfMonth } },
    }),
    prisma.trip.groupBy({
      by: ['kind'],
      where: { lifecycleStatus: 'trip_completed', completedAt: { gte: startOfMonth } },
      _count: { _all: true },
    }),
  ]);

  const mrr = activeSubscriptions * MONTHLY_SUBSCRIPTION_USD;
  const arr = mrr * 12;
  const revenueTodayUsd = revenueToday._sum.amount ?? 0;
  const revenueMonthUsd = revenueMonth._sum.amount ?? 0;
  const commissionUsd = Math.round(revenueMonthUsd * 0.15 * 100) / 100;

  const serviceRevenue = {
    rides: paymentsByKind.find((k) => k.kind === 'ride')?._count._all ?? 0,
    deliveries: paymentsByKind.filter((k) => k.kind !== 'ride').reduce((s, k) => s + k._count._all, 0),
    packages: 0,
    business: 0,
  };

  return {
    revenueTodayUsd,
    revenueMonthUsd,
    commissionUsd,
    activeSubscriptions,
    failedPayments,
    refunds,
    mrr,
    arr,
    serviceRevenue,
    placeholder: revenueMonthUsd === 0,
    note:
      revenueMonthUsd === 0
        ? 'Sin pagos completados — datos de suscripción y conteos reales; montos de viaje pueden ser placeholder hasta integración de pagos.'
        : undefined,
  };
}

export async function listFinancePayments(limit = 50) {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { id: true, fullName: true, phoneNumber: true } },
    },
  });

  return payments.map((p) => ({
    id: p.id,
    userId: p.userId,
    userName: p.user.fullName,
    tripId: p.tripId,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    provider: p.provider,
    failureReason: p.failureReason,
    paidAt: p.paidAt?.toISOString() ?? null,
    refundedAt: p.refundedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
  }));
}

export async function listFinanceSubscriptions() {
  const subs = await prisma.driverSubscription.findMany({
    orderBy: { registeredAt: 'desc' },
    take: 100,
  });
  return subs.map((s) => ({
    driverId: s.driverId,
    status: s.status,
    monthlyAmountUsd: s.monthlyAmountUsd,
    trialEndsAt: s.trialEndsAt?.toISOString() ?? null,
    nextBillingAt: s.nextBillingAt?.toISOString() ?? null,
    lastPaidAt: s.lastPaidAt?.toISOString() ?? null,
  }));
}

export async function requestFinanceRefund(
  paymentId: string,
  adminUserId: string,
  actorRole?: string
) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false as const, error: 'Pago no encontrado' };
  if (payment.status !== 'completed') {
    return { ok: false as const, error: 'Solo pagos completados pueden marcarse reembolsados.' };
  }

  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'refunded', refundedAt: new Date() },
  });

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'refund',
    entityType: 'payment',
    entityId: paymentId,
    before: { status: payment.status },
    after: { status: 'refunded' },
    changes: { note: 'Marcado reembolsado en admin — sin procesador de pagos real' },
  });

  return {
    ok: true as const,
    payment: updated,
    placeholder: true,
    message: 'Reembolso registrado en BD. Integración de pagos real pendiente.',
  };
}
