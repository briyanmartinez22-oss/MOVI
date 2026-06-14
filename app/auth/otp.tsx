import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, MoviLogo } from '../../src/components';
import { FormInput, ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { resolveCurrentProfiles } from '../../src/services/mockApi';
import { getRoleHomeRoute } from '../../src/utils/platform';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { showSuccess } from '../../src/utils/feedback';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { DEMO_OTP_CODE } from '../../src/services/otpService';
import { colors, typography, spacing } from '../../src/theme';

export default function OtpScreen() {
  const router = useRouter();
  const { phone, flow, returnRoute, next, dui: duiParam, firstName, lastName, action, inviteCode, name, responsibleName, businessName, businessPhone, nit, businessType } =
    useLocalSearchParams<{
      phone: string;
      flow?: string;
      returnRoute?: string;
      next?: string;
      dui?: string;
      firstName?: string;
      lastName?: string;
      action?: string;
      inviteCode?: string;
      name?: string;
      responsibleName?: string;
      businessName?: string;
      businessPhone?: string;
      nit?: string;
      businessType?: string;
    }>();
  const postOtpRoute = returnRoute ?? next;
  const { verifyOtp, login, refresh } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [dui, setDui] = useState(duiParam ?? '');
  const [otpVerified, setOtpVerified] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction(15000);

  const isLoginFlow = flow !== 'register';

  const forwardAfterOtp = (): Record<string, string> => {
    const params: Record<string, string> = {
      phone: phone ?? '',
      dui: duiParam ?? dui,
      verified: '1',
    };
    if (firstName) params.firstName = firstName;
    if (lastName) params.lastName = lastName;
    if (action) params.action = action;
    if (inviteCode) params.code = inviteCode;
    if (name) params.name = name;
    if (responsibleName) params.responsibleName = responsibleName;
    if (businessName) params.businessName = businessName;
    if (businessPhone) params.businessPhone = businessPhone;
    if (nit) params.nit = nit;
    if (businessType) params.businessType = businessType;
    return params;
  };

  const handleVerifyOtp = async () => {
    setError('');
    await run(async () => {
      const verify = await verifyOtp(phone ?? '', otpCode);
      if (!verify.ok) {
        setError(verify.error ?? 'Código inválido');
        return;
      }
      setIsNewUser(!!verify.isNewUser);
      setOtpVerified(true);

      if (verify.isNewUser) {
        if (isLoginFlow) {
          setError('No encontramos una cuenta. Crea una cuenta para continuar.');
          return;
        }
        if (postOtpRoute) {
          const params = forwardAfterOtp();
          if (postOtpRoute === '/auth/register-passenger') {
            params.action = action ?? 'create';
            params.consented = '1';
          }
          router.replace({
            pathname: postOtpRoute as never,
            params,
          });
        } else {
          router.replace({ pathname: '/auth/register-account', params: { phone } });
        }
        return;
      }

      // Teléfono ya registrado durante flujo de registro → iniciar sesión
      if (!isLoginFlow) {
        return;
      }
    });
  };

  const handleLoginWithDui = async () => {
    if (!dui.trim()) {
      setError('Ingresa tu DUI');
      return;
    }
    setError('');
    await run(async () => {
      const res = await login(phone ?? '', dui, otpCode);
      if (res.ok) {
        refresh();
        const { user } = resolveCurrentProfiles();
        showSuccess('Sesión iniciada', `Bienvenido${user ? `, ${user.fullName}` : ''}.`);
        router.replace(user ? (getRoleHomeRoute(user.role) as never) : '/welcome');
      } else {
        setError(res.error ?? 'Error al iniciar sesión');
      }
    });
  };

  const showDuiStep = otpVerified && !isNewUser;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={showDuiStep ? 'Verificar DUI' : 'Verificación OTP'} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <MoviLogo size="md" style={styles.logo} />
        <Text style={styles.subtitle}>
          {showDuiStep
            ? isLoginFlow
              ? 'Confirma tu identidad con tu DUI'
              : 'Este teléfono ya tiene cuenta. Confirma tu DUI para iniciar sesión.'
            : `Código enviado a ${phone}`}
        </Text>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />

        {!showDuiStep ? (
          <>
            <FormInput
              label="Código OTP"
              value={otpCode}
              onChangeText={setOtpCode}
              placeholder="123456"
              keyboardType="numeric"
              hint={FIELD_HINTS.otp}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton title="Verificar" onPress={handleVerifyOtp} loading={loading} />
            <Text style={styles.demo}>Demo OTP: {DEMO_OTP_CODE}</Text>
            {error.includes('Crea una cuenta') ? (
              <PrimaryButton
                title="Crear cuenta"
                onPress={() => router.replace('/auth/register-account')}
                variant="outline"
                style={styles.secondaryBtn}
              />
            ) : null}
          </>
        ) : (
          <>
            <FormInput
              label="DUI"
              value={dui}
              onChangeText={setDui}
              placeholder="01234567-8"
              hint={FIELD_HINTS.dui}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton title="Iniciar sesión" onPress={handleLoginWithDui} loading={loading} />
          </>
        )}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: spacing.lg, justifyContent: 'center', alignItems: 'center' },
  logo: { marginBottom: spacing.md },
  subtitle: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center', width: '100%' },
  error: { ...typography.caption, color: colors.danger, marginBottom: spacing.md },
  demo: { ...typography.caption, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  secondaryBtn: { marginTop: spacing.md },
});
