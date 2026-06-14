import { View, Text, StyleSheet } from 'react-native';
import { VehicleType } from '../types/models';
import { colors, typography, spacing, radius } from '../theme';
import { getVehicleTypeMeta } from '../utils/vehicleTypes';

type Props = {
  type?: VehicleType;
  compact?: boolean;
};

export function VehicleBadge({ type, compact = false }: Props) {
  const meta = getVehicleTypeMeta(type);

  return (
    <View style={[styles.badge, compact && styles.badgeCompact]}>
      <View style={[styles.icon, { backgroundColor: meta.accentColor }]}>
        <Text style={styles.iconEmoji}>{meta.emoji}</Text>
      </View>
      <Text style={[styles.label, compact && styles.labelCompact]}>{meta.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  badgeCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 14,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  labelCompact: {
    ...typography.caption,
    fontWeight: '600',
  },
});
