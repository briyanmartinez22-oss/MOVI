import { View, Text, StyleSheet } from 'react-native';
import { PrimaryButton } from './PrimaryButton';
import { colors, typography, spacing } from '../theme';

type Props = {
  onGoHome: () => void;
};

export function SafeBackFallback({ onGoHome }: Props) {
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.message}>
          Todavía no hay una pantalla anterior disponible.
        </Text>
        <PrimaryButton title="Volver al inicio" onPress={onGoHome} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 360,
    gap: spacing.lg,
  },
  message: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
});
