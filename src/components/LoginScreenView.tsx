import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from './PrimaryButton';
import { MoviLogo } from './MoviLogo';
import { FormInput } from './FormUI';
import { HelpButton } from './HelpButton';
import { KeyboardAwareScreen } from './KeyboardAwareScreen';
import { LoadingTimeoutBanner } from './LoadingTimeoutBanner';
import { useAuth } from '../context/AuthContext';
import { useAsyncAction } from '../utils/asyncAction';
import { DEMO_OTP_CODE } from '../services/otpService';
import { FIELD_HINTS } from '../data/fieldHints';
import { colors, typography, spacing } from '../theme';

export function LoginScreenView() {
  const router = useRouter();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [dui, setDui] = useState('');
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction();

  const handleContinue = async () => {
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Ingresa un número de teléfono válido');
      return;
    }
    if (!dui.trim()) {
      setError('Ingresa tu DUI');
      return;
    }
    setError('');
    await run(async () => {
      const res = await requestOtp(phone);
      if (res.ok) {
        router.push({ pathname: '/auth/otp', params: { phone, dui } });
      } else {
        setError(res.error ?? 'Error al enviar OTP');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.helpRow}>
        <HelpButton />
        {__DEV__ ? (
          <View style={styles.devLinks}>
            <Text style={styles.devLink} onPress={() => router.push('/dev/learning')}>
              Conocer MOVI
            </Text>
            <Text style={styles.devLink} onPress={() => router.push('/dev/qa')}>
              QA automático
            </Text>
          </View>
        ) : null}
      </View>
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <MoviLogo size="md" />
        <Text style={styles.subtitle}>Teléfono y DUI para identificarte</Text>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        <FormInput
          label="Teléfono"
          value={phone}
          onChangeText={setPhone}
          placeholder="7777 7777"
          keyboardType="phone-pad"
          hint={FIELD_HINTS.phone}
        />
        <FormInput
          label="DUI"
          value={dui}
          onChangeText={setDui}
          placeholder="01234567-8"
          hint={FIELD_HINTS.dui}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Continuar" onPress={handleContinue} loading={loading} />
        {__DEV__ ? <Text style={styles.demo}>OTP demo: {DEMO_OTP_CODE}</Text> : null}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  devLinks: { flexDirection: 'row', gap: spacing.md },
  devLink: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  content: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.lg },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  demo: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm },
});
