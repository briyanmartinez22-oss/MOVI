import { prisma } from '../lib/prisma';

export async function getDriverSubscription(driverId: string) {
  return prisma.driverSubscription.findUnique({ where: { driverId } });
}

export async function canDriverOperate(driverId: string): Promise<{ ok: boolean; reason?: string }> {
  const sub = await getDriverSubscription(driverId);
  if (!sub) return { ok: false, reason: 'Sin suscripción activa' };

  if (sub.status === 'suspended' || sub.status === 'past_due') {
    return { ok: false, reason: 'Suscripción vencida. Renueva para operar.' };
  }

  if (sub.status === 'trial_until_next_month' && sub.trialEndsAt < new Date()) {
    await prisma.driverSubscription.update({
      where: { driverId },
      data: { status: 'past_due' },
    });
    return { ok: false, reason: 'Periodo de gracia finalizado.' };
  }

  return { ok: true };
}

export async function getSubscriptionForUser(userId: string) {
  const driver = await prisma.driver.findUnique({
    where: { userId },
    include: { subscription: true },
  });
  if (!driver?.subscription) return null;

  const s = driver.subscription;
  return {
    id: s.id,
    driverId: driver.id,
    status: s.status,
    monthlyAmountUsd: s.monthlyAmountUsd,
    registeredAt: s.registeredAt.toISOString(),
    trialEndsAt: s.trialEndsAt.toISOString(),
    nextBillingAt: s.nextBillingAt.toISOString(),
    paymentMethod: s.paymentMethod,
    paymentProvider: s.paymentProvider,
    lastPaidAt: s.lastPaidAt?.toISOString(),
  };
}

export async function markSubscriptionPaid(driverId: string, provider: string, method?: string) {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return prisma.driverSubscription.update({
    where: { driverId },
    data: {
      status: 'active',
      paymentProvider: provider,
      paymentMethod: method,
      lastPaidAt: now,
      nextBillingAt: next,
    },
  });
}
