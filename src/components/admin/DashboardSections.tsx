import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { KpiCard } from '../KpiCard';
import { Card } from '../FormUI';
import {
  getUserMetrics,
  getOperationMetrics,
  getFinancialKpis,
  getQualityKpis,
  getIntelligenceKpis,
  getMoviExclusiveKpis,
  getVehicleTypeKpis,
} from '../../services/analyticsService';
import { fetchAdminKpis } from '../../services/mockApi';
import { useMockApi } from '../../services/api/config';
import { getSimulationMeta } from '../../services/mockStore';
import { colors, typography, spacing } from '../../theme';

type AdminKpisPayload = {
  totals?: {
    users?: number;
    drivers?: number;
    owners?: number;
    business?: number;
    vehicles?: number;
  };
  operations?: {
    tripsToday?: number;
    deliveriesToday?: number;
    activeDrivers?: number;
    expiredDrivers?: number;
  };
  revenue?: {
    mrr?: number;
    arr?: number;
    subscriptionCount?: number;
  };
};

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

function KpiRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function DashboardSections() {
  const mockMode = useMockApi();
  const [apiKpis, setApiKpis] = useState<AdminKpisPayload | null>(null);

  useEffect(() => {
    if (mockMode) return;
    void fetchAdminKpis().then((data) => {
      if (data && typeof data === 'object') {
        setApiKpis(data as AdminKpisPayload);
      }
    });
  }, [mockMode]);

  const users = mockMode
    ? getUserMetrics()
    : {
        totalUsers: apiKpis?.totals?.users ?? 0,
        activeUsers: apiKpis?.operations?.activeDrivers ?? 0,
        totalPassengers: Math.max(
          0,
          (apiKpis?.totals?.users ?? 0) -
            (apiKpis?.totals?.drivers ?? 0) -
            (apiKpis?.totals?.owners ?? 0) -
            (apiKpis?.totals?.business ?? 0)
        ),
        totalDrivers: apiKpis?.totals?.drivers ?? 0,
        totalOwners: apiKpis?.totals?.owners ?? 0,
        totalBusinesses: apiKpis?.totals?.business ?? 0,
        totalVehicles: apiKpis?.totals?.vehicles ?? 0,
        activeDriversOnline: apiKpis?.operations?.activeDrivers ?? 0,
      };

  const ops = mockMode
    ? getOperationMetrics()
    : {
        tripsToday: apiKpis?.operations?.tripsToday ?? 0,
        tripsWeek: 0,
        tripsMonth: 0,
        deliveriesToday: apiKpis?.operations?.deliveriesToday ?? 0,
        deliveriesWeek: 0,
        deliveriesMonth: 0,
        activeTrips: 0,
        totalTrips: apiKpis?.operations?.tripsToday ?? 0,
        totalDeliveries: apiKpis?.operations?.deliveriesToday ?? 0,
        pendingRequests: 0,
      };

  const financial = mockMode
    ? getFinancialKpis()
    : {
        activeDrivers: 0,
        trialDrivers: 0,
        suspendedDrivers: 0,
        pastDueDrivers: apiKpis?.operations?.expiredDrivers ?? 0,
        monthlyRevenue: apiKpis?.revenue?.mrr ?? 0,
        mrr: apiKpis?.revenue?.mrr ?? 0,
        arr: apiKpis?.revenue?.arr ?? 0,
        renewals: apiKpis?.revenue?.subscriptionCount ?? 0,
        churn: 0,
        revenueByCity: [{ city: 'San Salvador', amount: apiKpis?.revenue?.mrr ?? 0 }],
        driverStates: {
          active: 0,
          trial: 0,
          suspended: 0,
          pastDue: apiKpis?.operations?.expiredDrivers ?? 0,
        },
      };

  const quality = mockMode
    ? getQualityKpis()
    : {
        cancellations: 0,
        complaints: 0,
        reports: 0,
        completionRate: 0,
        bestDrivers: [] as { id: string; name: string; rating: number }[],
        worstDrivers: [] as { id: string; name: string; rating: number }[],
      };

  const intel = mockMode
    ? getIntelligenceKpis()
    : {
        peakHours: [] as string[],
        peakDays: [] as string[],
        hotspotsCount: 0,
        hotZones: [] as string[],
        topRoutes: [] as string[],
        avgArrivalMinutes: 0,
        avgWaitMinutes: 0,
        avgOfferedPrice: 0,
        fuelSavedLiters: 0,
        connectedDrivers: apiKpis?.operations?.activeDrivers ?? 0,
      };

  const movi = mockMode
    ? getMoviExclusiveKpis()
    : {
        kmTraveled: 0,
        kmSaved: 0,
        fuelSavedLiters: 0,
        timeSavedMinutes: 0,
        digitalTripsCount: 0,
      };

  const vehicleKpis = mockMode ? getVehicleTypeKpis() : [];
  const meta = mockMode ? getSimulationMeta() : null;

  return (
    <View>
      <SectionTitle>USUARIOS</SectionTitle>
      <KpiRow>
        <KpiCard label="Total usuarios" value={users.totalUsers} />
        <KpiCard label="Activos" value={users.activeUsers} />
        <KpiCard label="Pasajeros" value={users.totalPassengers} />
        <KpiCard label="Conductores" value={users.totalDrivers} />
        <KpiCard label="Dueños" value={users.totalOwners} />
        <KpiCard label="Negocios" value={users.totalBusinesses} />
      </KpiRow>

      <SectionTitle>OPERACIÓN</SectionTitle>
      <KpiRow>
        <KpiCard label="Viajes hoy" value={ops.tripsToday} />
        <KpiCard label="Viajes semana" value={ops.tripsWeek} />
        <KpiCard label="Viajes mes" value={ops.tripsMonth} />
        <KpiCard label="Entregas hoy" value={ops.deliveriesToday} />
        <KpiCard label="Entregas semana" value={ops.deliveriesWeek} />
        <KpiCard label="Entregas mes" value={ops.deliveriesMonth} />
        <KpiCard label="Viajes activos" value={ops.activeTrips} />
        <KpiCard label="Unidades" value={users.totalVehicles} />
      </KpiRow>

      <SectionTitle>FINANZAS</SectionTitle>
      {meta ? (
        <KpiRow>
          <KpiCard label="Retención" value={`${meta.retentionPct}%`} />
          <KpiCard label="Churn" value={`${meta.churnPct}%`} />
          <KpiCard label="Conversión" value={`${meta.conversionPct}%`} />
          <KpiCard label="Tiempo llegada" value={`${meta.avgArrivalMinutes} min`} />
          <KpiCard label="Tiempo respuesta" value={`${meta.avgResponseSeconds} s`} />
        </KpiRow>
      ) : null}
      <KpiRow>
        <KpiCard label="MRR" value={`$${financial.mrr}`} />
        <KpiCard label="ARR" value={`$${financial.arr}`} />
        <KpiCard label="Ingreso mensual" value={`$${financial.monthlyRevenue}`} />
        <KpiCard label="Activos" value={financial.driverStates.active} />
        <KpiCard label="En prueba" value={financial.driverStates.trial} />
        <KpiCard label="Suspendidos" value={financial.driverStates.suspended} />
        <KpiCard label="Vencidos" value={financial.driverStates.pastDue} />
      </KpiRow>
      <Card style={styles.block}>
        {financial.revenueByCity.map((row) => (
          <Text key={row.city} style={styles.line}>
            {row.city}: ${row.amount.toFixed(2)}/mes
          </Text>
        ))}
      </Card>

      <SectionTitle>CALIDAD</SectionTitle>
      <KpiRow>
        <KpiCard label="Cancelaciones" value={quality.cancellations} />
        <KpiCard label="Quejas" value={quality.complaints} />
        <KpiCard label="Reportes" value={quality.reports} />
        <KpiCard label="Tasa completado" value={`${quality.completionRate}%`} />
      </KpiRow>
      <Card style={styles.block}>
        <Text style={styles.subheading}>Mejores conductores</Text>
        {quality.bestDrivers.map((d) => (
          <Text key={d.id} style={styles.line}>
            {d.name} · ★ {d.rating.toFixed(1)}
          </Text>
        ))}
        <Text style={[styles.subheading, styles.gapTop]}>Conductores a mejorar</Text>
        {quality.worstDrivers.map((d) => (
          <Text key={`w-${d.id}`} style={styles.line}>
            {d.name} · ★ {d.rating.toFixed(1)}
          </Text>
        ))}
      </Card>

      <SectionTitle>KPI POR TIPO DE VEHÍCULO</SectionTitle>
      <KpiRow>
        {vehicleKpis.slice(0, 6).map((row) => (
          <KpiCard
            key={row.vehicleType}
            label={row.label}
            value={`${row.trips + row.deliveries}`}
            hint={`${row.trips} viajes · ${row.deliveries} entregas · $${row.revenue.toFixed(0)}`}
          />
        ))}
      </KpiRow>
      <Card style={styles.block}>
        {vehicleKpis.map((row) => (
          <Text key={row.vehicleType} style={styles.line}>
            {row.label}: {row.vehicles} unidades · {row.activeDrivers} online · {row.trips} viajes ·{' '}
            {row.deliveries} entregas · ${row.revenue.toFixed(2)}
          </Text>
        ))}
      </Card>

      <SectionTitle>INTELIGENCIA</SectionTitle>
      <Card style={styles.block}>
        <Text style={styles.line}>Horas pico: {intel.peakHours.join(', ')}</Text>
        <Text style={styles.line}>Días pico: {intel.peakDays.join(', ')}</Text>
        <Text style={styles.line}>Hotspots: {intel.hotspotsCount}</Text>
        <Text style={styles.line}>Zonas: {intel.hotZones.join(' · ') || '—'}</Text>
        <Text style={styles.line}>Rutas top: {intel.topRoutes.join(' | ')}</Text>
        <Text style={styles.line}>Llegada prom.: {intel.avgArrivalMinutes} min</Text>
        <Text style={styles.line}>Espera prom.: {intel.avgWaitMinutes} min</Text>
        <Text style={styles.line}>Precio prom.: ${intel.avgOfferedPrice.toFixed(2)}</Text>
        <Text style={styles.line}>Combustible ahorrado: {intel.fuelSavedLiters} L</Text>
        <Text style={styles.line}>Conductores conectados: {intel.connectedDrivers}</Text>
      </Card>

      <SectionTitle>MOVI exclusivo</SectionTitle>
      <Card style={styles.highlight}>
        <Text style={styles.highlightTitle}>Impacto MOVI</Text>
        <Text style={styles.highlightValue}>
          MOVI ha evitado {movi.kmSaved.toLocaleString()} km de recorridos innecesarios y ahorró{' '}
          {movi.timeSavedMinutes.toLocaleString()} minutos de búsqueda a conductores.
        </Text>
        <Text style={styles.highlightMeta}>
          {movi.kmTraveled.toLocaleString()} km recorridos · {movi.fuelSavedLiters} L combustible
          estimado · {movi.digitalTripsCount} viajes digitales
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  block: { marginBottom: spacing.md },
  line: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  subheading: { ...typography.bodyMedium, color: colors.text, marginBottom: spacing.xs },
  gapTop: { marginTop: spacing.sm },
  highlight: { marginBottom: spacing.lg, backgroundColor: colors.borderLight },
  highlightTitle: { ...typography.bodyMedium, color: colors.text },
  highlightValue: { ...typography.subtitle, color: colors.primary, marginTop: spacing.sm },
  highlightMeta: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
});
