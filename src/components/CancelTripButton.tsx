import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { useCancelTrip } from '../hooks/useCancelTrip';
import type { TripCancelledBy } from '../utils/tripCancellation';
import { colors, typography, spacing, radius } from '../theme';

type Props = {
  by: TripCancelledBy;
  variant?: 'button' | 'link' | 'destructive-link';
  title?: string;
  style?: ViewStyle;
  redirect?: boolean;
  onSuccess?: () => void;
};

export function CancelTripButton({
  by,
  variant = 'button',
  title = 'Cancelar viaje',
  style,
  redirect = true,
  onSuccess,
}: Props) {
  const { confirmAndCancel, loading } = useCancelTrip();

  if (variant === 'button') {
    return (
      <PrimaryButton
        title={title}
        onPress={() => confirmAndCancel(by, { redirect, onSuccess })}
        loading={loading}
        variant="outline"
        style={style}
      />
    );
  }

  return (
    <TouchableOpacity
      style={[styles.link, variant === 'destructive-link' && styles.destructiveLink, style]}
      onPress={() => confirmAndCancel(by, { redirect, onSuccess })}
      disabled={loading}
      accessibilityLabel={title}
    >
      <Text style={[styles.linkText, variant === 'destructive-link' && styles.destructiveText]}>
        {loading ? 'Cancelando…' : title}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.borderLight,
    alignSelf: 'stretch',
  },
  destructiveLink: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  linkText: {
    ...typography.caption,
    color: colors.brandRed,
    fontWeight: '600',
  },
  destructiveText: {
    color: colors.danger,
  },
});
