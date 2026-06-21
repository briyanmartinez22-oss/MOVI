import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../FormUI';
import type { OperationalAlertRecord } from '../../../types/adminCenter';
import { colors, typography, spacing, radius } from '../../../theme';

type Props = {
  alerts: OperationalAlertRecord[];
  onSelectAlert?: (alert: OperationalAlertRecord) => void;
  onAck?: (alert: OperationalAlertRecord) => void;
  onResolve?: (alert: OperationalAlertRecord) => void;
};

export function IntelligentAlertCenter({ alerts, onSelectAlert, onAck, onResolve }: Props) {
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
      {alerts.slice(0, 10).map((alert) => (
        <Card
          key={alert.id}
          style={StyleSheet.flatten([
            styles.alertCard,
            alert.severity === 'critical' ? styles.critical : styles.warning,
          ]) as ViewStyle}
        >
          <TouchableOpacity onPress={() => onSelectAlert?.(alert)}>
            <Text style={styles.alertType}>{alert.type}</Text>
            <Text style={styles.alertMessage}>{alert.message}</Text>
            <Text style={styles.alertMeta}>{alert.status} · {alert.entityType}</Text>
          </TouchableOpacity>
          {alert.status !== 'resolved' ? (
            <View style={styles.actions}>
              {alert.status === 'open' && onAck ? (
                <TouchableOpacity onPress={() => onAck(alert)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>Ack</Text>
                </TouchableOpacity>
              ) : null}
              {onResolve ? (
                <TouchableOpacity onPress={() => onResolve(alert)} style={styles.actionBtn}>
                  <Text style={styles.actionText}>Resolver</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.md },
  title: { ...typography.subtitle, color: colors.text, marginBottom: spacing.sm },
  alertCard: { marginBottom: spacing.xs, borderWidth: 1 },
  critical: { borderColor: colors.danger, backgroundColor: colors.dangerLight },
  warning: { borderColor: colors.warning, backgroundColor: `${colors.warning}18` },
  alertType: { ...typography.caption, fontWeight: '600', color: colors.text },
  alertMessage: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  alertMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.background,
  },
  actionText: { ...typography.caption, color: colors.primary },
  empty: { marginBottom: spacing.md },
  emptyText: { ...typography.caption, color: colors.textSecondary },
});
