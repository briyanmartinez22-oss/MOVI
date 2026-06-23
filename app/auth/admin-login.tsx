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
import { colors, typography, spacing } from '../../src/theme';

/** Login administrativo — OTP + DUI (SUPER_ADMIN y staff). */
export default function AdminLoginScreen() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction(15000);

  const phoneValid = isValidMoviPhone(phone);

  const handleContinue = async () => {
    if (!phoneValid) {
      setError('Ingresa un teléfono válido');
      return;
    }
    const normalized = normalizePhone(phone);
    setError('');
    await run(async () => {
      const res = await requestOtp(normalized);
      if (res.ok) {
        router.push({
          pathname: '/auth/otp',
          params: { phone: normalized, flow: 'admin-login' },
        });
      } else {
        setError(res.error ?? 'Error al enviar OTP');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Acceso administrador" onBack={() => router.replace('/auth/login')} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <MoviLogo size="md" />
        <BrandTagline variant="secondary" />
        <Text style={styles.subtitle}>
          Acceso restringido — verificación OTP para cuentas administrativas.
        </Text>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        <FormInput
          label="Teléfono"
          value={phone}
          onChangeText={setPhone}
          placeholder="2144698637"
          keyboardType="phone-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Enviar OTP" onPress={handleContinue} loading={loading} disabled={!phoneValid} />
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
