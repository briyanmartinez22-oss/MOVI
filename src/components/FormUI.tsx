import { View, Text, StyleSheet, TouchableOpacity, TextInput, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radius } from '../theme';
import { HelpButton } from './HelpButton';
import { SafeBackFallback } from './SafeBackFallback';
import { useSafeBack } from '../hooks/useSafeBack';

export function ScreenHeader({
  title,
  onBack,
  helpText,
  showFallback: showFallbackProp,
  onGoHome,
}: {
  title: string;
  onBack?: () => void;
  helpText?: string;
  /** Control externo del fallback (opcional) */
  showFallback?: boolean;
  onGoHome?: () => void;
}) {
  const safe = useSafeBack();
  const handleBack = onBack ?? safe.handleBack;
  const showFallback = showFallbackProp ?? safe.showFallback;
  const goHome = onGoHome ?? safe.goHome;

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} accessibilityLabel="Atrás">
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <HelpButton helpText={helpText} compact />
      </View>
      {showFallback ? <SafeBackFallback onGoHome={goHome} /> : null}
    </>
  );
}

export function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
  hint,
  onBlur,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'numeric';
  multiline?: boolean;
  hint?: string;
  onBlur?: () => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        inputMode={keyboardType === 'phone-pad' ? 'tel' : keyboardType === 'numeric' ? 'numeric' : 'text'}
        autoComplete={keyboardType === 'phone-pad' ? 'tel' : 'off'}
        editable
        multiline={multiline}
        onBlur={onBlur}
      />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{status.replace(/_/g, ' ')}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  field: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  input: {
    backgroundColor: colors.borderLight,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.text,
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.borderLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  badgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: 'capitalize',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
});
