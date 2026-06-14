import { Text, StyleSheet } from 'react-native';
import { Card } from '../FormUI';
import { getIntelligenceKpis } from '../../services/analyticsService';
import { colors, typography, spacing } from '../../theme';

type Props = { compact?: boolean };

export function OperationsSnapshot({ compact }: Props) {
  const intel = getIntelligenceKpis();

  return (
    <Card style={compact ? styles.compact : undefined}>
      <Text style={styles.title}>Inteligencia operativa</Text>
      <Text style={styles.line}>Horas pico: {intel.peakHours.join(', ')}</Text>
      <Text style={styles.line}>Días pico: {intel.peakDays.join(', ')}</Text>
      <Text style={styles.line}>ETA promedio: {intel.avgArrivalMinutes} min</Text>
      <Text style={styles.line}>Espera promedio: {intel.avgWaitMinutes} min</Text>
      <Text style={styles.line}>Precio oferta promedio: ${intel.avgOfferedPrice.toFixed(2)}</Text>
      <Text style={styles.line}>Hotspots: {intel.hotZones.join(' · ') || '—'}</Text>
      <Text style={styles.line}>Conductores online: {intel.connectedDrivers}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  compact: { marginVertical: spacing.sm },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  line: { ...typography.caption, color: colors.textSecondary, marginBottom: 4 },
});
