import type { DriverSubscription, PaymentMethodBrand, SubscriptionStatus } from '../types/models';

export const SUBSCRIPTION_MONTHLY_USD = 7;

/** Primer cobro: día 1 del mes siguiente al registro. */
export function getFirstBillingDate(registeredAt: Date): Date {
  const next = new Date(registeredAt.getFullYear(), registeredAt.getMonth() + 1, 1);
  return next;
}

export function getTrialEndDate(registeredAt: Date): Date {
  return getFirstBillingDate(registeredAt);
}

export function createDriverSubscription(driverId: string, registeredAt = new Date()): DriverSubscription {
  const iso = registeredAt.toISOString();
  const trialEnds = getTrialEndDate(registeredAt);
  return {
    id: `sub-${driverId}`,
    driverId,
    status: 'trial_until_next_month',
    monthlyAmountUsd: SUBSCRIPTION_MONTHLY_USD,
    registeredAt: iso,
    trialEndsAt: trialEnds.toISOString(),
    nextBillingAt: trialEnds.toISOString(),
  };
}

export function resolveSubscriptionStatus(
  sub: DriverSubscription,
  now = new Date()
): SubscriptionStatus {
  if (sub.status === 'suspended') return 'suspended';
  const trialEnd = new Date(sub.trialEndsAt);
  if (now < trialEnd) return 'trial_until_next_month';
  if (sub.lastPaidAt) {
    const nextBill = new Date(sub.nextBillingAt);
    if (now > nextBill) return 'past_due';
    return 'active';
  }
  if (now >= trialEnd) return 'past_due';
  return sub.status;
}

export function canDriverOperateSubscription(sub: DriverSubscription | undefined): {
  allowed: boolean;
  reason?: string;
} {
  if (!sub) {
    return { allowed: true, reason: undefined };
  }
  const status = resolveSubscriptionStatus(sub);
  if (status === 'suspended') {
    return {
      allowed: false,
      reason: 'Suscripción suspendida. Renueva tu plan de $7 USD/mes para operar.',
    };
  }
  if (status === 'past_due') {
    return {
      allowed: false,
      reason: 'Pago pendiente. Actualiza tu método de pago ($7 USD/mes).',
    };
  }
  return { allowed: true };
}

export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    trial_until_next_month: 'Prueba gratis',
    active: 'Activa',
    past_due: 'Pago pendiente',
    suspended: 'Suspendida',
  };
  return labels[status];
}

export function formatPaymentMethod(method?: PaymentMethodBrand): string {
  if (!method) return 'Sin método registrado';
  const labels: Record<PaymentMethodBrand, string> = {
    visa_credit: 'Visa Crédito',
    visa_debit: 'Visa Débito',
    mastercard_credit: 'Mastercard Crédito',
    mastercard_debit: 'Mastercard Débito',
  };
  return labels[method];
}

export function mockProcessPayment(
  sub: DriverSubscription,
  method: PaymentMethodBrand
): DriverSubscription {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return {
    ...sub,
    status: 'active',
    paymentMethod: method,
    paymentProvider: 'mock',
    lastPaidAt: now.toISOString(),
    nextBillingAt: nextMonth.toISOString(),
  };
}
