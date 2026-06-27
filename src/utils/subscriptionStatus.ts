import type { DriverSubscription } from '../types/models';
import { canDriverOperateSubscription } from '../services/subscriptionService';

export type MvpSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'BLOCKED';

export const MVP_MONTHLY_FEE_USD = 7;

export function mapSubscriptionMvpStatus(sub: DriverSubscription): MvpSubscriptionStatus {
  if (sub.status === 'suspended') return 'BLOCKED';
  if (sub.status === 'active') return 'ACTIVE';
  if (sub.status === 'past_due') return 'PAST_DUE';
  if (sub.status === 'trial_until_next_month') {
    const trialEnd = new Date(sub.trialEndsAt);
    return new Date() < trialEnd ? 'TRIAL' : 'PAST_DUE';
  }
  return 'PAST_DUE';
}

export function canOperateWithSubscription(sub: DriverSubscription | undefined): {
  allowed: boolean;
  reason?: string;
  mvpStatus: MvpSubscriptionStatus;
} {
  const guard = canDriverOperateSubscription(sub);
  const mvpStatus = sub ? mapSubscriptionMvpStatus(sub) : 'TRIAL';
  if (!guard.allowed) {
    return {
      allowed: false,
      mvpStatus: mvpStatus === 'TRIAL' ? 'PAST_DUE' : mvpStatus,
      reason: guard.reason,
    };
  }
  return { allowed: true, mvpStatus };
}

export const MVP_SUBSCRIPTION_LABELS: Record<MvpSubscriptionStatus, string> = {
  TRIAL: 'Prueba gratis',
  ACTIVE: 'Activa',
  PAST_DUE: 'Pago pendiente',
  BLOCKED: 'Bloqueada',
};
