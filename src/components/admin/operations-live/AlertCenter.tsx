import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../FormUI';
import type { OperationsAlert } from '../../../types/operationsLive';
import { colors, typography, spacing, radius } from '../../../theme';

type Props = {
  alerts: OperationsAlert[];
  onSelectAlert?: (alert: OperationsAlert) => void;
};

const TYPE_LABELS: Record<OperationsAlert['type'], string> = {
  no_match: 'Sin match',
  cancellation: 'Cancelación',
  sla: 'SLA',
};

const TYPE_ICONS: Record<OperationsAlert['type'], keyof typeof Ionicons.glyphMap> = {
  no_match: 'alert-circle',
  cancellation: 'close-circle',
  sla: 'time',
};

export function AlertCenter({ alerts, onSelectAlert }: Props) {
  if (alerts.length === 0) {
    return (
      <Card style={styles.empty}>
        <Text style={styles.emptyText}>Sin alertas activas</Text>
      </Card>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>Centro de alertas ({alerts.length})</Text>
      {alerts.slice(0, 8).map((alert) => (
        <TouchableOpacity
          key={alert.id}
          onPress={() => onSelectAlert?.(alert)}
          activeOpacity={0.8}
        >
          <Card
            style={StyleSheet.flatten([
              styles.alertCard,
              alert.severity === 'critical' ? styles.critical : styles.warning,
            ]) as ViewStyle}
          >
            <View style={styles.row}>
              <Ionicons
                name={TYPE_ICONS[alert.type]}
                size={18}
                color={alert.severity === 'critical' ? colors.danger : colors.warning}
              />
              <View style={styles.content}>
                <Text style={styles.alertType}>{TYPE_LABELS[alert.type]}</Text>
                <Text style={styles.alertMessage} numberOfLines={2}>
                  {alert.passengerName}: {alert.message}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  title: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  alertCard: {
    marginBottom: spacing.xs,
    borderWidth: 1,
  },
  critical: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  warning: {
    borderColor: colors.warning,
    backgroundColor: `${colors.warning}12`,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  content: { flex: 1 },
  alertType: { ...typography.caption, color: colors.text, fontWeight: '600' },
  alertMessage: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  empty: { marginBottom: spacing.md },
  emptyText: { ...typography.caption, color: colors.textSecondary },
});
