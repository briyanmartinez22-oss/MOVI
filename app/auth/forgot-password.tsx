import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { FormInput } from '../../src/components/FormUI';
import { ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { isValidMoviPhone, normalizePhone } from '../../src/utils/platform';
import { colors, typography, spacing } from '../../src/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword } = useAuth();
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction(15000);

  const handleSubmit = async () => {
    if (!isValidMoviPhone(phone)) {
      setError('Ingresa un teléfono válido');
      return;
    }
    setError('');
    await run(async () => {
      const res = await forgotPassword(normalizePhone(phone));
      if (res.ok) {
        router.push({
          pathname: '/auth/otp',
          params: { phone: normalizePhone(phone), flow: 'reset-password' },
        });
      } else {
        setError(res.error ?? 'Error al enviar OTP');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Recuperar contraseña" onBack={() => router.replace('/auth/login')} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Ingresa tu teléfono. Te enviaremos un código OTP para restablecer tu contraseña.
        </Text>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        <FormInput
          label="Teléfono"
          value={phone}
          onChangeText={setPhone}
          placeholder="7777 7777"
          keyboardType="phone-pad"
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Enviar OTP" onPress={handleSubmit} loading={loading} />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, gap: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary },
  error: { ...typography.caption, color: colors.danger },
});
