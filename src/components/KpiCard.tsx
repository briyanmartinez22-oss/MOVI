import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

type Props = { label: string; value: string | number; hint?: string };

export function KpiCard({ label, value, hint }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  value: { ...typography.subtitle, color: colors.text },
  label: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
  hint: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
