import { View, StyleSheet } from 'react-native';
import { KpiCard } from '../KpiCard';
import { getExecutiveKpis } from '../../services/analyticsService';
import { formatRating, useAdminMetrics } from '../../hooks/useAdminMetrics';
import { spacing } from '../../theme';

export function ExecutiveKpiGrid() {
  const { metrics, mockMode } = useAdminMetrics();
  const summary = metrics.summary;

  if (mockMode) {
    const k = getExecutiveKpis();
    return (
      <View style={styles.grid}>
        <KpiCard label="MRR" value={`$${k.mrr}`} />
        <KpiCard label="Pasajeros" value={k.activeUsers} />
        <KpiCard label="Viajes hoy" value={k.tripsToday} />
        <KpiCard label="Conductores online" value={k.activeUsers} />
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      <KpiCard label="Pasajeros" value={summary?.totalPassengers ?? 0} />
      <KpiCard label="Proveedores" value={summary?.totalProviders ?? 0} />
      <KpiCard label="Pendientes verif." value={summary?.providersPendingVerification ?? 0} />
      <KpiCard label="Verificados" value={summary?.providersVerified ?? 0} />
      <KpiCard label="Viajes activos" value={summary?.tripsActive ?? 0} />
      <KpiCard label="Completados" value={summary?.tripsCompleted ?? 0} />
      <KpiCard label="Ofertas enviadas" value={summary?.totalOffers ?? 0} />
      <KpiCard
        label="Calif. proveedores"
        value={formatRating(summary?.avgProviderRating ?? 0, summary?.avgProviderRatingCount ?? 0)}
      />
      <KpiCard label="Conductores online" value={summary?.driversOnline ?? 0} />
      <KpiCard
        label="Ingreso mensual"
        value={`$${summary?.projectedMonthlyRevenueUsd ?? 0}`}
        hint={`${summary?.subscriptionsActive ?? 0} suscripciones × $${summary?.monthlySubscriptionFeeUsd ?? 7}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
});
