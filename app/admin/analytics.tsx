import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader, Card } from '../../src/components/FormUI';
import { KpiCard } from '../../src/components/KpiCard';
import { OperationsSnapshot } from '../../src/components/admin/OperationsSnapshot';
import { ExportActions } from '../../src/components/admin/ExportActions';
import {
  getUserMetrics,
  getOperationMetrics,
  getFinancialKpis,
  getQualityKpis,
  getIntelligenceKpis,
  getMoviExclusiveKpis,
} from '../../src/services/analyticsService';
import { colors, typography, spacing } from '../../src/theme';

export default function AdminAnalytics() {
  const users = getUserMetrics();
  const ops = getOperationMetrics();
  const financial = getFinancialKpis();
  const quality = getQualityKpis();
  const intel = getIntelligenceKpis();
  const movi = getMoviExclusiveKpis();

  const tripBars = [
    ops.tripsToday,
    ops.tripsWeek,
    ops.tripsMonth,
    ops.deliveriesToday,
    ops.deliveriesWeek,
    ops.deliveriesMonth,
  ];
  const maxBar = Math.max(...tripBars, 1);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Analítica avanzada" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Usuarios</Text>
        <View style={styles.grid}>
          <KpiCard label="Total" value={users.totalUsers} />
          <KpiCard label="Activos" value={users.activeUsers} />
          <KpiCard label="Online" value={users.activeDriversOnline} />
        </View>

        <Text style={styles.section}>Operación</Text>
        <View style={styles.grid}>
          <KpiCard label="Viajes hoy" value={ops.tripsToday} />
          <KpiCard label="Viajes mes" value={ops.tripsMonth} />
          <KpiCard label="Entregas hoy" value={ops.deliveriesToday} />
          <KpiCard label="Activos ahora" value={ops.activeTrips} />
        </View>
        <OperationsSnapshot />

        <Text style={styles.section}>Inteligencia</Text>
        <Card style={styles.block}>
          <Text style={styles.line}>Horas pico: {intel.peakHours.join(', ')}</Text>
          <Text style={styles.line}>Hotspots: {intel.hotspotsCount}</Text>
          <Text style={styles.line}>Rutas: {intel.topRoutes.join(' · ')}</Text>
          <Text style={styles.line}>
            Tiempos: llegada {intel.avgArrivalMinutes} min · espera {intel.avgWaitMinutes} min · $
            {intel.avgOfferedPrice.toFixed(2)}
          </Text>
          <Text style={styles.line}>Combustible ahorrado: {intel.fuelSavedLiters} L</Text>
        </Card>

        <Text style={styles.section}>Calidad</Text>
        <Card style={styles.block}>
          <Text style={styles.line}>Cancelaciones: {quality.cancellations}</Text>
          <Text style={styles.line}>Quejas: {quality.complaints}</Text>
          <Text style={styles.line}>Reportes: {quality.reports}</Text>
          <Text style={styles.line}>Completado: {quality.completionRate}%</Text>
          <Text style={styles.line}>Mejor: {quality.bestDrivers[0]?.name ?? '—'}</Text>
          <Text style={styles.line}>A mejorar: {quality.worstDrivers[0]?.name ?? '—'}</Text>
        </Card>

        <Text style={styles.section}>Financiero</Text>
        <Card style={styles.block}>
          <Text style={styles.line}>MRR: ${financial.mrr}</Text>
          <Text style={styles.line}>ARR: ${financial.arr}</Text>
          <Text style={styles.line}>Renovaciones: {financial.renewals}</Text>
          <Text style={styles.line}>Churn: {financial.churn}</Text>
          {financial.revenueByCity.map((row) => (
            <Text key={row.city} style={styles.line}>
              {row.city}: ${row.amount.toFixed(2)}
            </Text>
          ))}
          <Text style={styles.line}>
            Estados — activos: {financial.driverStates.active} · prueba:{' '}
            {financial.driverStates.trial} · suspendidos: {financial.driverStates.suspended}
          </Text>
        </Card>

        <Text style={styles.section}>MOVI exclusivo</Text>
        <Card style={styles.block}>
          <Text style={styles.line}>{movi.kmSaved.toLocaleString()} km evitados</Text>
          <Text style={styles.line}>{movi.kmTraveled.toLocaleString()} km recorridos</Text>
          <Text style={styles.line}>{movi.fuelSavedLiters} L combustible</Text>
          <Text style={styles.line}>{movi.timeSavedMinutes} min ahorrados</Text>
        </Card>

        <Text style={styles.section}>Tendencias operativas</Text>
        <View style={styles.chart}>
          {tripBars.map((v, i) => (
            <View key={i} style={[styles.bar, { height: Math.max(12, (v / maxBar) * 90) }]} />
          ))}
        </View>
        <Text style={styles.chartLegend}>
          Viajes/entregas: hoy · sem · mes · ent hoy · ent sem · ent mes
        </Text>

        <ExportActions />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  block: { marginBottom: spacing.md },
  line: { ...typography.body, color: colors.text, marginTop: 4 },
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
