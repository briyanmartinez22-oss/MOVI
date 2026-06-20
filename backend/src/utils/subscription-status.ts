/** MVP subscription states exposed to clients. */
export type MvpSubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'EXPIRED';

const DB_TO_MVP: Record<string, MvpSubscriptionStatus> = {
  trial_until_next_month: 'TRIAL',
  active: 'ACTIVE',
  past_due: 'EXPIRED',
  suspended: 'EXPIRED',
};

export function mapSubscriptionMvpStatus(dbStatus: string): MvpSubscriptionStatus {
  return DB_TO_MVP[dbStatus] ?? 'EXPIRED';
}

export const MVP_MONTHLY_FEE_USD = 7;
