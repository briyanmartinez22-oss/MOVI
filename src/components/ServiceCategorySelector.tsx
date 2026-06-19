import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import type { TripType } from '../types';
import {
  DEFAULT_SERVICE_CATEGORY_ID,
  getCategoryMinPrice,
  getServiceCategory,
  resolveTripTypeForCategory,
  SERVICE_CATEGORIES,
  type ServiceCategoryId,
} from '../data/serviceCategories';
import { colors, typography, spacing, radius } from '../theme';
import { formatPrice } from '../utils/pricing';

type Props = {
  categoryId: ServiceCategoryId;
  tripType: TripType;
  onCategoryChange: (id: ServiceCategoryId) => void;
  onTripTypeChange: (type: TripType) => void;
};

export function ServiceCategorySelector({
  categoryId,
  tripType,
  onCategoryChange,
  onTripTypeChange,
}: Props) {
  const category = getServiceCategory(categoryId);
  const effectiveTripType = resolveTripTypeForCategory(categoryId, tripType);

  const handleCategoryChange = (id: ServiceCategoryId) => {
    onCategoryChange(id);
    const next = getServiceCategory(id);
    if (!next.supportsShared) {
      onTripTypeChange('private');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Categoría de servicio</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryRow}
      >
        {SERVICE_CATEGORIES.map((item) => {
          const active = item.id === categoryId;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => handleCategoryChange(item.id)}
            >
              <Text style={styles.categoryEmoji}>{item.emoji}</Text>
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <Text style={styles.categoryDescription}>{category.description}</Text>

      {category.supportsShared ? (
        <>
          <Text style={styles.sectionLabel}>Modalidad</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              style={[styles.modeOption, effectiveTripType === 'shared' && styles.modeOptionActive]}
              onPress={() => onTripTypeChange('shared')}
            >
              <Text
                style={[styles.modeTitle, effectiveTripType === 'shared' && styles.modeTitleActive]}
              >
                {category.label} Compartido
              </Text>
              <Text style={styles.modeSubtitle}>
                Mínimo {formatPrice(getCategoryMinPrice(categoryId, 'shared'))}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modeOption, effectiveTripType === 'private' && styles.modeOptionActive]}
              onPress={() => onTripTypeChange('private')}
            >
              <Text
                style={[styles.modeTitle, effectiveTripType === 'private' && styles.modeTitleActive]}
              >
                {category.label} Privado
              </Text>
              <Text style={styles.modeSubtitle}>
                Mínimo {formatPrice(getCategoryMinPrice(categoryId, 'private'))}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.privateOnly}>
          <Text style={styles.privateOnlyTitle}>Servicio privado</Text>
          <Text style={styles.privateOnlySubtitle}>
            Mínimo {formatPrice(getCategoryMinPrice(categoryId, 'private'))}
          </Text>
        </View>
      )}
    </View>
  );
}

export { DEFAULT_SERVICE_CATEGORY_ID };

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: spacing.sm,
  },
  categoryRow: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryChip: {
    minWidth: 96,
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  categoryChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.borderLight,
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryLabel: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  categoryLabelActive: {
    color: colors.primary,
  },
  categoryDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modeRow: {
    gap: spacing.sm,
  },
  modeOption: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  modeOptionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.borderLight,
  },
  modeTitle: {
    ...typography.bodyMedium,
    color: colors.text,
  },
  modeTitleActive: {
    fontWeight: '700',
  },
  modeSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
  privateOnly: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.borderLight,
  },
  privateOnlyTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  privateOnlySubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 4,
  },
});
