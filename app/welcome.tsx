import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoviLogo } from '../src/components/MoviLogo';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { HelpButton } from '../src/components/HelpButton';
import { useAuth } from '../src/context/AuthContext';
import { BrandTagline } from '../src/components/BrandTagline';
import { colors, typography, spacing } from '../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleDemoReset = async () => {
    await logout();
    router.replace('/welcome');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topRow}>
        <HelpButton />
      </View>
      <View style={styles.content}>
        <MoviLogo size="lg" onDemoReset={handleDemoReset} />
        <BrandTagline variant="primary" style={styles.primaryTagline} />
        <BrandTagline variant="secondary" />
        <Text style={styles.sub}>
          Mototaxi · Comida · Mensajería · Paquetería · Entregas comerciales
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
        </View>
        {__DEV__ ? (
          <Text style={styles.dev} onPress={() => router.push('/dev/learning')}>
            Aprender MOVI
          </Text>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const buttonShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.12,
  shadowRadius: 12,
  elevation: 4,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.brandWhite },
  topRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  primaryTagline: {
    marginTop: spacing.sm,
  },
  sub: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  actions: {
    width: '100%',
    maxWidth: 360,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  primaryBtn: buttonShadow,
  outlineBtn: {
    ...buttonShadow,
    shadowOpacity: 0.06,
    elevation: 2,
  },
  dev: {
    ...typography.caption,
    color: colors.brandRed,
    marginTop: spacing.xl,
    fontWeight: '600',
  },
});
