import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoviLogo } from '../../src/components/MoviLogo';
import { BrandTagline } from '../../src/components/BrandTagline';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { FormInput } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { ScreenHeader } from '../../src/components/FormUI';
import { useAuth } from '../../src/context/AuthContext';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { isValidMoviPhone, normalizePhone } from '../../src/utils/platform';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { colors, typography, spacing } from '../../src/theme';

/** Permite dígitos, +, espacios y guiones mientras se escribe — sin normalizar. */
function sanitizePhoneInput(text: string): string {
  return text.replace(/[^\d+\s()-]/g, '');
}

/** Login unificado — solo teléfono; OTP y DUI en pasos siguientes. */
export default function AuthLoginScreen() {
  const router = useRouter();
  const { requestOtp, logout } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction(15000);

  const phoneValid = isValidMoviPhone(phone);

  const handlePhoneChange = (text: string) => {
    setError('');
    setPhone(sanitizePhoneInput(text));
  };

  const handleContinue = async () => {
    if (!phoneValid) {
      setError('Ingresa un teléfono válido: El Salvador (8 dígitos) o EE.UU. (10 dígitos)');
      return;
    }
    const normalized = normalizePhone(phone);
    setError('');
    await run(async () => {
      const res = await requestOtp(normalized);
      if (res.ok) {
        router.push({ pathname: '/auth/otp', params: { phone: normalized, flow: 'login' } });
      } else {
        setError(res.error ?? 'Error al enviar OTP');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Iniciar sesión" onBack={() => router.replace('/welcome')} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <MoviLogo
          size="md"
          onDemoReset={async () => {
            await logout();
            router.replace('/welcome');
          }}
        />
        <BrandTagline variant="secondary" />
        <Text style={styles.subtitle}>Ingresa tu número de teléfono (+503 o +1)</Text>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        <FormInput
          label="Teléfono"
          value={phone}
          onChangeText={handlePhoneChange}
          placeholder="2144698637 o 70801111"
          keyboardType="phone-pad"
          hint={FIELD_HINTS.phone}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          title="Continuar"
          onPress={handleContinue}
          loading={loading}
          disabled={!phoneValid}
        />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.caption, color: colors.danger },
});
