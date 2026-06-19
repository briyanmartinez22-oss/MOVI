import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../../src/components/FormUI';
import { KpiCard } from '../../src/components/KpiCard';
import { OperationsSnapshot } from '../../src/components/admin/OperationsSnapshot';
import { ExportActions } from '../../src/components/admin/ExportActions';
import { formatRating, useAdminMetrics } from '../../src/hooks/useAdminMetrics';
import {
  getFinancialKpis,
  getOperationMetrics,
  getQualityKpis,
  getUserMetrics,
} from '../../src/services/analyticsService';
import { colors, typography, spacing } from '../../src/theme';

export default function AdminAnalytics() {
  const { metrics, mockMode } = useAdminMetrics();
  const { summary, trips, ratings, subscriptions, providers } = metrics;

  if (mockMode) {
    const users = getUserMetrics();
    const ops = getOperationMetrics();
    const financial = getFinancialKpis();
    const quality = getQualityKpis();

    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Analítica avanzada" />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.note}>Modo simulación — datos de demo local</Text>
          <Text style={styles.section}>Usuarios</Text>
          <View style={styles.grid}>
            <KpiCard label="Total" value={users.totalUsers} />
            <KpiCard label="Activos" value={users.activeUsers} />
            <KpiCard label="Online" value={users.activeDriversOnline} />
          </View>
          <Text style={styles.section}>Operación</Text>
          <View style={styles.grid}>
            <KpiCard label="Viajes hoy" value={ops.tripsToday} />
            <KpiCard label="Activos ahora" value={ops.activeTrips} />
          </View>
          <Text style={styles.section}>Financiero</Text>
          <Card style={styles.block}>
            <Text style={styles.line}>MRR: ${financial.mrr}</Text>
            <Text style={styles.line}>Activos: {financial.driverStates.active}</Text>
          </Card>
          <Text style={styles.section}>Calidad</Text>
          <Card style={styles.block}>
            <Text style={styles.line}>Cancelaciones: {quality.cancellations}</Text>
            <Text style={styles.line}>Completado: {quality.completionRate}%</Text>
          </Card>
          <ExportActions />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const tripBars = [
    trips?.tripsToday ?? 0,
    trips?.tripsWeek ?? 0,
    trips?.tripsMonth ?? 0,
    summary?.tripsActive ?? 0,
    summary?.tripsCompleted ?? 0,
    summary?.tripsCancelled ?? 0,
  ];
  const maxBar = Math.max(...tripBars, 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Analítica avanzada" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.note}>Datos reales desde PostgreSQL</Text>

        <Text style={styles.section}>Resumen</Text>
        <View style={styles.grid}>
          <KpiCard label="Pasajeros" value={summary?.totalPassengers ?? 0} />
          <KpiCard label="Proveedores" value={summary?.totalProviders ?? 0} />
          <KpiCard label="Pendientes verif." value={summary?.providersPendingVerification ?? 0} />
          <KpiCard label="Verificados" value={summary?.providersVerified ?? 0} />
          <KpiCard label="Suspendidos" value={summary?.providersSuspended ?? 0} />
        </View>

        <Text style={styles.section}>Operación</Text>
        <View style={styles.grid}>
          <KpiCard label="Solicitados" value={summary?.tripsRequested ?? 0} />
          <KpiCard label="Activos" value={summary?.tripsActive ?? 0} />
          <KpiCard label="Completados" value={summary?.tripsCompleted ?? 0} />
          <KpiCard label="Cancelados" value={summary?.tripsCancelled ?? 0} />
          <KpiCard label="Ofertas totales" value={summary?.totalOffers ?? 0} />
          <KpiCard label="Pendientes" value={trips?.pendingRequests ?? 0} />
        </View>
        <OperationsSnapshot />

        <Text style={styles.section}>Calificaciones</Text>
        <Card style={styles.block}>
          <Text style={styles.line}>
            Proveedores:{' '}
            {formatRating(summary?.avgProviderRating ?? 0, summary?.avgProviderRatingCount ?? 0)}
            {summary?.avgProviderRatingCount ? ` (${summary.avgProviderRatingCount} calificaciones)` : ''}
          </Text>
          <Text style={styles.line}>
            Pasajeros:{' '}
            {formatRating(summary?.avgPassengerRating ?? 0, summary?.avgPassengerRatingCount ?? 0)}
            {summary?.avgPassengerRatingCount ? ` (${summary.avgPassengerRatingCount} calificaciones)` : ''}
          </Text>
          {(ratings?.recent.length ?? 0) === 0 ? (
            <Text style={styles.muted}>Sin datos todavía</Text>
          ) : (
            ratings?.recent.slice(0, 5).map((r) => (
              <Text key={r.id} style={styles.line}>
                {r.rateeRole}: ★ {r.stars}
              </Text>
            ))
          )}
        </Card>

        <Text style={styles.section}>Suscripciones</Text>
        <Card style={styles.block}>
          <Text style={styles.line}>Activas: {summary?.subscriptionsActive ?? 0}</Text>
          <Text style={styles.line}>Vencidas: {summary?.subscriptionsExpired ?? 0}</Text>
          <Text style={styles.line}>En prueba: {subscriptions?.trial ?? 0}</Text>
          <Text style={styles.line}>
            Ingreso mensual proyectado: ${summary?.projectedMonthlyRevenueUsd ?? 0}
          </Text>
          <Text style={styles.muted}>
            {summary?.subscriptionsActive ?? 0} proveedores ACTIVE × $
            {summary?.monthlySubscriptionFeeUsd ?? 7} USD
          </Text>
        </Card>

        <Text style={styles.section}>Proveedores por estado</Text>
        <Card style={styles.block}>
          {providers?.driversByStatus &&
          Object.keys(providers.driversByStatus).length > 0 ? (
            Object.entries(providers.driversByStatus).map(([status, count]) => (
              <Text key={status} style={styles.line}>
                Conductores {status}: {count}
              </Text>
            ))
          ) : (
            <Text style={styles.muted}>Sin datos todavía</Text>
          )}
        </Card>

        <Text style={styles.section}>Tendencias operativas</Text>
        <View style={styles.chart}>
          {tripBars.map((v, i) => (
            <View key={i} style={[styles.bar, { height: Math.max(12, (v / maxBar) * 90) }]} />
          ))}
        </View>
        <Text style={styles.chartLegend}>
          Hoy · Semana · Mes · Activos · Completados · Cancelados
        </Text>

        <ExportActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  note: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  block: { marginBottom: spacing.md },
  line: { ...typography.body, color: colors.text, marginTop: 4 },
  muted: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 100,
    gap: spacing.sm,
    marginBottom: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.borderLight,
    borderRadius: 12,
  },
  bar: { flex: 1, backgroundColor: colors.primary, borderRadius: 4 },
  chartLegend: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.lg },
});
