import { View, Text, StyleSheet } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors, typography, spacing } from '../theme';

type Props = {
  visible: boolean;
  onRetry: () => void;
};

export function LoadingTimeoutBanner({ visible, onRetry }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No fue posible completar la acción.</Text>
      <PrimaryButton title="Intentar nuevamente" onPress={onRetry} variant="outline" style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  text: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  btn: {
    height: 44,
  },
});
