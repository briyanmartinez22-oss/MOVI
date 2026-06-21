import { View, StyleSheet } from 'react-native';
import { KpiCard } from '../../KpiCard';
import type { OperationsLiveSnapshot } from '../../../types/operationsLive';
import { spacing } from '../../../theme';

type Props = {
  snapshot: OperationsLiveSnapshot | null;
};

export function OperationsLiveKpiBar({ snapshot }: Props) {
  return (
    <View style={styles.grid}>
      <KpiCard label="Conductores online" value={snapshot?.driversOnline ?? 0} />
      <KpiCard label="Conductores ocupados" value={snapshot?.driversBusy ?? 0} />
      <KpiCard label="Viajes activos" value={snapshot?.activeTrips ?? 0} />
      <KpiCard label="Viajes pendientes" value={snapshot?.pendingTrips ?? 0} />
      <KpiCard
        label="Espera promedio"
        value={`${snapshot?.avgWaitMinutes ?? 0} min`}
        hint={`SLA ${snapshot?.slaWaitMinutes ?? 5} min`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
