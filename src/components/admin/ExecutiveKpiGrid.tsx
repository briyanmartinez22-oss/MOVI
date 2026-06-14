import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { KpiCard } from '../KpiCard';
import { getExecutiveKpis } from '../../services/analyticsService';
import { fetchAdminKpis } from '../../services/mockApi';
import { useMockApi } from '../../services/api/config';
import type { ExecutiveKpis } from '../../types/models';
import { spacing } from '../../theme';

function kpisFromApi(data: Record<string, unknown>): ExecutiveKpis {
  const totals = data.totals as Record<string, number> | undefined;
  const operations = data.operations as Record<string, number> | undefined;
  const revenue = data.revenue as Record<string, number> | undefined;

  return {
    mrr: revenue?.mrr ?? 0,
    arr: revenue?.arr ?? 0,
    tripsToday: operations?.tripsToday ?? 0,
    tripsWeek: 0,
    tripsMonth: 0,
    deliveriesToday: operations?.deliveriesToday ?? 0,
    deliveriesWeek: 0,
    deliveriesMonth: 0,
    activeUsers: totals?.users ?? operations?.activeDrivers ?? 0,
    driversPastDue: operations?.expiredDrivers ?? 0,
  };
}

export function ExecutiveKpiGrid() {
  const [k, setK] = useState<ExecutiveKpis>(() => getExecutiveKpis());

  useEffect(() => {
    if (useMockApi()) {
      setK(getExecutiveKpis());
      return;
    }
    void fetchAdminKpis().then((data) => {
      if (data && typeof data === 'object') {
        setK(kpisFromApi(data as Record<string, unknown>));
      }
    });
  }, []);

  return (
    <View style={styles.grid}>
      <KpiCard label="MRR" value={`$${k.mrr}`} />
      <KpiCard label="ARR" value={`$${k.arr}`} />
      <KpiCard label="Viajes hoy" value={k.tripsToday} />
      <KpiCard label="Viajes semana" value={k.tripsWeek} />
      <KpiCard label="Viajes mes" value={k.tripsMonth} />
      <KpiCard label="Entregas hoy" value={k.deliveriesToday} />
      <KpiCard label="Entregas semana" value={k.deliveriesWeek} />
      <KpiCard label="Entregas mes" value={k.deliveriesMonth} />
      <KpiCard label="Usuarios activos" value={k.activeUsers} />
      <KpiCard label="Conductores vencidos" value={k.driversPastDue} />
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
