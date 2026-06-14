import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  HOTSPOT_SERVICE_OPTIONS,
  HOTSPOT_VEHICLE_OPTIONS,
  HotspotFilterState,
  HotspotServiceFilter,
  HotspotVehicleFilter,
} from '../utils/hotspotFilters';
import { colors, typography, spacing, radius } from '../theme';

type Props = {
  filters: HotspotFilterState;
  onChange: (filters: HotspotFilterState) => void;
  compact?: boolean;
};

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function HotspotFilterBar({ filters, onChange, compact }: Props) {
  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <Text style={styles.label}>Tipo de servicio</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {HOTSPOT_SERVICE_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            active={filters.service === opt.key}
            onPress={() => onChange({ ...filters, service: opt.key as HotspotServiceFilter })}
          />
        ))}
      </ScrollView>
      <Text style={styles.label}>Tipo de vehículo</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {HOTSPOT_VEHICLE_OPTIONS.map((opt) => (
          <Chip
            key={opt.key}
            label={opt.label}
            active={filters.vehicleType === opt.key}
            onPress={() => onChange({ ...filters, vehicleType: opt.key as HotspotVehicleFilter })}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  wrapCompact: { marginBottom: spacing.xs },
  label: { ...typography.caption, color: colors.textMuted, fontWeight: '600' },
  row: { flexDirection: 'row', gap: spacing.xs, paddingVertical: 2 },
  chip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.borderLight,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.caption, color: colors.textSecondary },
  chipTextActive: { color: colors.primaryText, fontWeight: '600' },
});
