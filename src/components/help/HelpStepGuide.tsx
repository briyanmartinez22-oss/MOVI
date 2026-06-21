import { View, Text, StyleSheet, Image, ImageSourcePropType } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { HelpStep } from '../../data/helpCenterContent';
import { colors, typography, spacing, radius } from '../../theme';

type Props = {
  steps: HelpStep[];
  /** Mapa opcional screenshotKey → URI cuando existan assets */
  screenshotUris?: Record<string, ImageSourcePropType>;
};

function StepScreenshot({
  step,
  screenshotUris,
}: {
  step: HelpStep;
  screenshotUris?: Record<string, ImageSourcePropType>;
}) {
  const uri = step.screenshotKey ? screenshotUris?.[step.screenshotKey] : undefined;

  if (uri) {
    return (
      <Image
        source={uri}
        style={styles.screenshot}
        accessibilityLabel={step.screenshotAlt ?? step.title}
        resizeMode="cover"
      />
    );
  }

  if (!step.screenshotKey) return null;

  return (
    <View style={styles.placeholder} accessibilityLabel={`Captura pendiente: ${step.title}`}>
      <Ionicons name="image-outline" size={28} color={colors.textMuted} />
      <Text style={styles.placeholderTitle}>Captura próximamente</Text>
      <Text style={styles.placeholderKey}>{step.screenshotKey}</Text>
    </View>
  );
}

export function HelpStepGuide({ steps, screenshotUris }: Props) {
  const ordered = [...steps].sort((a, b) => a.order - b.order);

  return (
    <View style={styles.list}>
      {ordered.map((step) => (
        <View key={step.order} style={styles.stepCard}>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>Paso {step.order}</Text>
          </View>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Text style={styles.stepDescription}>{step.description}</Text>
          <StepScreenshot step={step} screenshotUris={screenshotUris} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md },
  stepCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  stepBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  stepBadgeText: { ...typography.caption, color: colors.brandRed, fontWeight: '600' },
  stepTitle: { ...typography.bodyMedium, color: colors.text },
  stepDescription: { ...typography.body, color: colors.textSecondary, lineHeight: 22 },
  screenshot: {
    width: '100%',
    height: 180,
    borderRadius: radius.md,
    marginTop: spacing.sm,
    backgroundColor: colors.borderLight,
  },
  placeholder: {
    marginTop: spacing.sm,
    height: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: spacing.md,
  },
  placeholderTitle: { ...typography.caption, color: colors.textMuted },
  placeholderKey: { ...typography.caption, color: colors.textMuted, fontSize: 11 },
});
