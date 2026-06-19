import { useEffect, useState } from 'react';
import { fetchAdminMetricsBundle } from '../services/api';
import { useMockApi } from '../services/api/config';
import type { AdminMetricsBundle } from '../types/adminMetrics';

const EMPTY_BUNDLE: AdminMetricsBundle = {
  summary: null,
  providers: null,
  trips: null,
  ratings: null,
  subscriptions: null,
  recentActivity: null,
};

export function useAdminMetrics() {
  const mockMode = useMockApi();
  const [metrics, setMetrics] = useState<AdminMetricsBundle>(EMPTY_BUNDLE);
  const [loading, setLoading] = useState(!mockMode);

  useEffect(() => {
    if (mockMode) {
      setMetrics(EMPTY_BUNDLE);
      setLoading(false);
      return;
    }
    setLoading(true);
    void fetchAdminMetricsBundle()
      .then(setMetrics)
      .finally(() => setLoading(false));
  }, [mockMode]);

  return { metrics, loading, mockMode };
}

export function formatRating(value: number, count: number): string {
  if (count === 0) return 'Sin datos todavía';
  return value.toFixed(1);
}

export function noDataLabel(count: number, fallback = '0'): string {
  return count === 0 ? 'Sin datos todavía' : fallback;
}
