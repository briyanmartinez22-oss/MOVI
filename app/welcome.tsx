import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoviLogo } from '../src/components/MoviLogo';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { colors, typography, spacing } from '../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <MoviLogo size="lg" />
        <Text style={styles.tagline}>
          La plataforma de movilidad, entregas y logística de El Salvador
        </Text>
        <View style={styles.actions}>
          <PrimaryButton
            title="Iniciar sesión"
            onPress={() => router.push('/auth/login')}
            style={styles.primaryBtn}
          />
          <PrimaryButton
            title="Crear cuenta"
            onPress={() => router.push('/auth/register-account')}
            variant="outline"
            style={styles.outlineBtn}
          />
          <PrimaryButton
            title="Aprender MOVI"
            onPress={() => router.push('/learn')}
            variant="outline"
            style={styles.learnBtn}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const buttonShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandWhite },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  tagline: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  primaryBtn: buttonShadow,
  outlineBtn: {
    ...buttonShadow,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  learnBtn: {
    ...buttonShadow,
    shadowOpacity: 0.04,
    elevation: 1,
  },
});
