import type { DriverSubscription } from '../types/models';

export type MvpSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';

export const MVP_MONTHLY_FEE_USD = 7;

export function mapSubscriptionMvpStatus(sub: DriverSubscription): MvpSubscriptionStatus {
  if (sub.status === 'active') return 'ACTIVE';
  if (sub.status === 'trial_until_next_month') {
    const trialEnd = new Date(sub.trialEndsAt);
    return new Date() < trialEnd ? 'TRIAL' : 'EXPIRED';
  }
  return 'EXPIRED';
}

export function canOperateWithSubscription(sub: DriverSubscription | undefined): {
  allowed: boolean;
  reason?: string;
  mvpStatus: MvpSubscriptionStatus;
} {
  if (!sub) {
    return { allowed: true, mvpStatus: 'TRIAL' };
  }
  const mvpStatus = mapSubscriptionMvpStatus(sub);
  if (mvpStatus === 'EXPIRED') {
    return {
      allowed: false,
      mvpStatus,
      reason: `Suscripción vencida. Renueva tu plan de $${MVP_MONTHLY_FEE_USD} USD/mes.`,
    };
  }
  return { allowed: true, mvpStatus };
}

export const MVP_SUBSCRIPTION_LABELS: Record<MvpSubscriptionStatus, string> = {
  TRIAL: 'Periodo de prueba',
  ACTIVE: 'Activa',
  EXPIRED: 'Vencida',
};
