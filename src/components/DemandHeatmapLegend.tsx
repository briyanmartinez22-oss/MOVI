import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme';

const ITEMS = [
  { key: 'high', color: 'rgba(229, 57, 53, 0.85)', label: 'Alta demanda' },
  { key: 'medium', color: 'rgba(255, 152, 0, 0.85)', label: 'Media' },
  { key: 'low', color: 'rgba(76, 175, 80, 0.85)', label: 'Baja' },
] as const;

type Props = {
  compact?: boolean;
};

export function DemandHeatmapLegend({ compact }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {!compact && <Text style={styles.title}>Zonas de demanda</Text>}
      <View style={styles.row}>
        {ITEMS.map((item) => (
          <View key={item.key} style={styles.item}>
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <Text style={styles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  wrapCompact: { paddingVertical: spacing.xs },
  title: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  label: { ...typography.caption, color: colors.textSecondary },
});
