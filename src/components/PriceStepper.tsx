import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TripType } from '../types';
import type { ServiceCategoryId } from '../data/serviceCategories';
import { formatPrice, getMinPriceForTrip, incrementPrice, decrementPrice } from '../utils/pricing';
import { colors, typography, spacing, radius } from '../theme';

type Props = {
  value: number;
  tripType: TripType;
  categoryId?: ServiceCategoryId;
  onChange: (price: number) => void;
};

export function PriceStepper({ value, tripType, categoryId, onChange }: Props) {
  const min = getMinPriceForTrip(tripType, categoryId);
  const canDecrease = value > min;
  const canIncrease = value < 10;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Precio ofertado</Text>
      <View style={styles.row}>
        <TouchableOpacity
          style={[styles.stepBtn, !canDecrease && styles.stepBtnDisabled]}
          onPress={() => onChange(decrementPrice(value, tripType, categoryId))}
          disabled={!canDecrease}
        >
          <Text style={styles.stepBtnText}>- $0.50</Text>
        </TouchableOpacity>

        <Text style={styles.price}>{formatPrice(value)}</Text>

        <TouchableOpacity
          style={[styles.stepBtn, !canIncrease && styles.stepBtnDisabled]}
          onPress={() => onChange(incrementPrice(value, tripType, categoryId))}
          disabled={!canIncrease}
        >
          <Text style={styles.stepBtnText}>+ $0.50</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.hint}>
        Mínimo {formatPrice(min)} · Máximo $10.00
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  stepBtn: {
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    minWidth: 88,
    alignItems: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  stepBtnText: {
    ...typography.label,
    color: colors.text,
  },
  price: {
    ...typography.price,
    color: colors.text,
    minWidth: 90,
    textAlign: 'center',
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
