import { View, Text, StyleSheet } from 'react-native';
import { KpiCard } from '../KpiCard';
import { Card } from '../FormUI';
import {
  getFinancialKpis,
  getOperationMetrics,
  getQualityKpis,
  getUserMetrics,
  getVehicleTypeKpis,
} from '../../services/analyticsService';
import { formatRating, useAdminMetrics } from '../../hooks/useAdminMetrics';
import { colors, typography, spacing } from '../../theme';

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

function KpiRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

function EmptyNote({ text = 'Sin datos todavía' }: { text?: string }) {
  return <Text style={styles.empty}>{text}</Text>;
}

export function DashboardSections() {
  const { metrics, mockMode } = useAdminMetrics();
  const { summary, providers, trips, ratings, subscriptions, recentActivity } = metrics;

  if (mockMode) {
    const users = getUserMetrics();
    const ops = getOperationMetrics();
    const financial = getFinancialKpis();
    const quality = getQualityKpis();
    const vehicleKpis = getVehicleTypeKpis();

    return (
      <View>
        <SectionTitle>USUARIOS (simulación)</SectionTitle>
        <KpiRow>
          <KpiCard label="Total usuarios" value={users.totalUsers} />
          <KpiCard label="Pasajeros" value={users.totalPassengers} />
          <KpiCard label="Conductores" value={users.totalDrivers} />
        </KpiRow>
        <SectionTitle>OPERACIÓN (simulación)</SectionTitle>
        <KpiRow>
          <KpiCard label="Viajes hoy" value={ops.tripsToday} />
          <KpiCard label="Viajes activos" value={ops.activeTrips} />
        </KpiRow>
        <SectionTitle>FINANZAS (simulación)</SectionTitle>
        <KpiRow>
          <KpiCard label="MRR" value={`$${financial.mrr}`} />
          <KpiCard label="Activos" value={financial.driverStates.active} />
        </KpiRow>
        <SectionTitle>CALIDAD (simulación)</SectionTitle>
        <KpiRow>
          <KpiCard label="Cancelaciones" value={quality.cancellations} />
          <KpiCard label="Completado" value={`${quality.completionRate}%`} />
        </KpiRow>
        <SectionTitle>KPI POR TIPO DE VEHÍCULO (simulación)</SectionTitle>
        <KpiRow>
          {vehicleKpis.slice(0, 4).map((row) => (
            <KpiCard key={row.vehicleType} label={row.label} value={row.trips + row.deliveries} />
          ))}
        </KpiRow>
      </View>
    );
  }

  return (
    <View>
      <SectionTitle>USUARIOS</SectionTitle>
      <KpiRow>
        <KpiCard label="Pasajeros registrados" value={summary?.totalPassengers ?? 0} />
        <KpiCard label="Proveedores (conductores)" value={summary?.totalProviders ?? 0} />
        <KpiCard label="Dueños registrados" value={providers?.totalOwners ?? 0} />
        <KpiCard label="Vehículos registrados" value={providers?.totalVehicles ?? 0} />
        <KpiCard label="Conductores online" value={summary?.driversOnline ?? 0} />
      </KpiRow>

      <SectionTitle>VERIFICACIÓN</SectionTitle>
      <KpiRow>
        <KpiCard label="Pendientes" value={summary?.providersPendingVerification ?? 0} />
        <KpiCard label="Verificados" value={summary?.providersVerified ?? 0} />
        <KpiCard label="Suspendidos" value={summary?.providersSuspended ?? 0} />
      </KpiRow>

      <SectionTitle>OPERACIÓN</SectionTitle>
      <KpiRow>
        <KpiCard label="Servicios solicitados" value={summary?.tripsRequested ?? 0} />
        <KpiCard label="Servicios activos" value={summary?.tripsActive ?? 0} />
        <KpiCard label="Completados" value={summary?.tripsCompleted ?? 0} />
        <KpiCard label="Cancelados" value={summary?.tripsCancelled ?? 0} />
        <KpiCard label="Solicitudes pendientes" value={trips?.pendingRequests ?? 0} />
        <KpiCard label="Viajes hoy" value={trips?.tripsToday ?? 0} />
        <KpiCard label="Viajes semana" value={trips?.tripsWeek ?? 0} />
        <KpiCard label="Viajes mes" value={trips?.tripsMonth ?? 0} />
        <KpiCard label="Ofertas enviadas" value={summary?.totalOffers ?? 0} />
        <KpiCard label="Ofertas hoy" value={trips?.offersToday ?? 0} />
      </KpiRow>

      <SectionTitle>FINANZAS</SectionTitle>
      <KpiRow>
        <KpiCard label="Suscripciones activas" value={summary?.subscriptionsActive ?? 0} />
        <KpiCard label="Suscripciones vencidas" value={summary?.subscriptionsExpired ?? 0} />
        <KpiCard label="En prueba" value={subscriptions?.trial ?? 0} />
        <KpiCard
          label="Ingreso mensual proyectado"
          value={`$${summary?.projectedMonthlyRevenueUsd ?? 0}`}
          hint={`${summary?.subscriptionsActive ?? 0} × $${summary?.monthlySubscriptionFeeUsd ?? 7} USD`}
        />
      </KpiRow>

      <SectionTitle>CALIFICACIONES</SectionTitle>
      <KpiRow>
        <KpiCard
          label="Prom. proveedores"
          value={formatRating(
            summary?.avgProviderRating ?? 0,
            summary?.avgProviderRatingCount ?? 0
          )}
        />
        <KpiCard
          label="Prom. pasajeros"
          value={formatRating(
            summary?.avgPassengerRating ?? 0,
            summary?.avgPassengerRatingCount ?? 0
          )}
        />
        <KpiCard label="Total calificaciones" value={ratings?.providers.count ?? 0} />
      </KpiRow>
      {(ratings?.recent.length ?? 0) === 0 ? (
        <EmptyNote />
      ) : (
        <Card style={styles.block}>
          {ratings?.recent.slice(0, 5).map((r) => (
            <Text key={r.id} style={styles.line}>
              {r.rateeRole}: ★ {r.stars} · viaje {r.tripId.slice(0, 8)}
            </Text>
          ))}
        </Card>
      )}

      <SectionTitle>ACTIVIDAD RECIENTE</SectionTitle>
      {(recentActivity?.trips.length ?? 0) === 0 &&
      (recentActivity?.offers.length ?? 0) === 0 &&
      (recentActivity?.driverRegistrations.length ?? 0) === 0 ? (
        <EmptyNote />
      ) : (
        <Card style={styles.block}>
          {recentActivity?.trips.slice(0, 3).map((t) => (
            <Text key={t.id} style={styles.line}>
              Viaje: {t.passengerName} · {t.lifecycleStatus}
            </Text>
          ))}
          {recentActivity?.offers.slice(0, 3).map((o) => (
            <Text key={o.id} style={styles.line}>
              Oferta: {o.driverName} · ${o.price.toFixed(2)}
            </Text>
          ))}
          {recentActivity?.driverRegistrations.slice(0, 3).map((d) => (
            <Text key={d.id} style={styles.line}>
              Conductor: {d.name} · {d.status}
            </Text>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  block: { marginBottom: spacing.md },
  line: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
  empty: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
});
