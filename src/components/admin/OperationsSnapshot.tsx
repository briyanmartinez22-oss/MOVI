import { Text, StyleSheet } from 'react-native';
import { Card } from '../FormUI';
import { useAdminMetrics } from '../../hooks/useAdminMetrics';
import { colors, typography, spacing } from '../../theme';

type Props = { compact?: boolean };

export function OperationsSnapshot({ compact }: Props) {
  const { metrics, mockMode } = useAdminMetrics();
  const summary = metrics.summary;
  const trips = metrics.trips;

  if (mockMode || !summary) {
    return (
      <Card style={compact ? styles.compact : undefined}>
        <Text style={styles.title}>Operación en vivo</Text>
        <Text style={styles.line}>Sin datos todavía</Text>
      </Card>
    );
  }

  return (
    <Card style={compact ? styles.compact : undefined}>
      <Text style={styles.title}>Operación en vivo (PostgreSQL)</Text>
      <Text style={styles.line}>Conductores online: {summary.driversOnline}</Text>
      <Text style={styles.line}>Viajes activos: {summary.tripsActive}</Text>
      <Text style={styles.line}>Solicitudes pendientes: {trips?.pendingRequests ?? 0}</Text>
      <Text style={styles.line}>Ofertas enviadas: {summary.totalOffers}</Text>
      <Text style={styles.line}>Completados: {summary.tripsCompleted}</Text>
      <Text style={styles.line}>Cancelados: {summary.tripsCancelled}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  compact: { marginVertical: spacing.sm },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  line: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
});
