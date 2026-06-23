import { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
import { getRoleHomeRoute } from '../../src/utils/platform';
import { showSuccess } from '../../src/utils/feedback';
import { colors, typography, spacing } from '../../src/theme';

function sanitizePhoneInput(text: string): string {
  return text.replace(/[^\d+\s()-]/g, '');
}

export default function AuthLoginScreen() {
  const router = useRouter();
  const { loginWithPassword, logout } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction(15000);

  const phoneValid = isValidMoviPhone(phone);
  const canSubmit = phoneValid && password.length >= 8;

  const handleLogin = async () => {
    if (!canSubmit) {
      setError('Ingresa teléfono y contraseña válidos');
      return;
    }
    setError('');
    await run(async () => {
      const res = await loginWithPassword(normalizePhone(phone), password);
      if (res.ok) {
        showSuccess('Sesión iniciada', 'Bienvenido de nuevo.');
        router.replace(getRoleHomeRoute(res.user?.role ?? 'passenger') as never);
        return;
      }
      if (res.code === 'PASSWORD_REQUIRED' || res.code === 'SET_PASSWORD_REQUIRED') {
        setError('Debes crear una contraseña antes de iniciar sesión.');
        router.push({
          pathname: '/auth/otp',
          params: { phone: normalizePhone(phone), flow: 'set-password' },
        });
        return;
      }
      if (res.code === 'API_URL_MISSING' || res.code === 'API_URL_LOCALHOST') {
        setError(res.error ?? 'Backend no configurado en la app.');
        return;
      }
      if (res.code === 'LOGIN_LOCKED') {
        setError(res.error ?? 'Demasiados intentos. Espera 15 minutos.');
        return;
      }
      if (res.code === 'NETWORK_ERROR') {
        setError(res.error ?? 'Error de conexión con el servidor.');
        return;
      }
      if (res.code === 'ADMIN_OTP_REQUIRED') {
        setError('Esta cuenta usa acceso administrativo OTP.');
        return;
      }
      setError(res.error ?? 'Error al iniciar sesión');
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
        <Text style={styles.subtitle}>Teléfono y contraseña</Text>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        <FormInput
          label="Teléfono"
          value={phone}
          onChangeText={(t) => setPhone(sanitizePhoneInput(t))}
          placeholder="7777 7777"
          keyboardType="phone-pad"
        />
        <FormInput
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Iniciar sesión" onPress={handleLogin} loading={loading} disabled={!canSubmit} />
        <Pressable onPress={() => router.push('/auth/forgot-password')}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/auth/register-account')}>
          <Text style={styles.link}>Crear cuenta</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/auth/admin-login')}>
          <Text style={styles.adminLink}>Acceso administrador</Text>
        </Pressable>
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', gap: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  error: { ...typography.caption, color: colors.danger },
  link: { ...typography.body, color: colors.primary, textAlign: 'center', marginTop: spacing.sm },
  adminLink: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
});
