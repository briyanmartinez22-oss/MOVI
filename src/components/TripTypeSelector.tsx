import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TripType } from '../types';
import { colors, typography, spacing, radius } from '../theme';
import { formatPrice, getMinPrice } from '../utils/pricing';

type Props = {
  value: TripType;
  onChange: (type: TripType) => void;
};

export function TripTypeSelector({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.option, value === 'shared' && styles.optionActive]}
        onPress={() => onChange('shared')}
      >
        <Text style={[styles.title, value === 'shared' && styles.titleActive]}>
          Mototaxi Compartido
        </Text>
        <Text style={styles.subtitle}>Mínimo {formatPrice(getMinPrice('shared'))}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.option, value === 'private' && styles.optionActive]}
        onPress={() => onChange('private')}
      >
        <Text style={[styles.title, value === 'private' && styles.titleActive]}>
          Mototaxi Privado
        </Text>
        <Text style={styles.subtitle}>Mínimo {formatPrice(getMinPrice('private'))}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  option: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.borderLight,
  },
  title: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  titleActive: {
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
