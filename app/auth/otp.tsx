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
import { isDevDiagnosticsEnabled } from '../../src/utils/devMode';
import { ContextualHelpLink } from '../../src/components/help/ContextualHelpLink';
import { colors, typography, spacing } from '../../src/theme';

export default function OtpScreen() {
  const router = useRouter();
  const {
    phone,
    flow,
    otpSent,
    returnRoute,
    next,
    dui: duiParam,
    firstName,
    lastName,
    action,
    inviteCode,
    name,
    responsibleName,
    businessName,
    businessPhone,
    nit,
    businessType,
    licenseFront,
    licenseBack,
  } = useLocalSearchParams<{
    phone: string;
    flow?: string;
    otpSent?: string;
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
    licenseFront?: string;
    licenseBack?: string;
  }>();
  const postOtpRoute = returnRoute ?? next;
  const { verifyOtp, loginWithOtpAdmin } = useAuth();
  const [otpCode, setOtpCode] = useState('');
  const [dui, setDui] = useState(duiParam ?? '');
  const [otpVerified, setOtpVerified] = useState(false);
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction(15000);

  const isRegisterFlow = flow === 'register' || (!flow && Boolean(postOtpRoute));
  const isAdminFlow = flow === 'admin-login';
  const adminOtpConfirmed = otpSent === '1';
  const isResetFlow = flow === 'reset-password';
  const isSetPasswordFlow = flow === 'set-password';

  const forwardAfterOtp = (): Record<string, string> => {
    const params: Record<string, string> = {
      phone: phone ?? '',
      verified: '1',
      code: otpCode,
    };
    if (duiParam) params.dui = duiParam;
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
    if (licenseFront) params.licenseFront = licenseFront;
    if (licenseBack) params.licenseBack = licenseBack;
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
      setOtpVerified(true);

      if (isAdminFlow) {
        if (!dui.trim()) {
          setError('Ingresa tu DUI administrativo');
          return;
        }
        const login = await loginWithOtpAdmin(phone ?? '', dui, otpCode);
        if (login.ok) {
          showSuccess('Sesión administrativa', 'Acceso concedido.');
          router.replace('/admin');
        } else {
          setError(login.error ?? 'Error al iniciar sesión');
        }
        return;
      }

      if (isResetFlow) {
        router.replace({
          pathname: '/auth/create-password',
          params: { phone: phone ?? '', flow: 'reset', code: otpCode },
        });
        return;
      }

      if (isSetPasswordFlow) {
        router.replace({
          pathname: '/auth/create-password',
          params: { phone: phone ?? '', flow: 'set', code: otpCode },
        });
        return;
      }

      if (isRegisterFlow) {
        if (verify.isNewUser === false && postOtpRoute) {
          // Registro con teléfono ya usado — dejar que el backend rechace
        }
        router.replace({
          pathname: '/auth/create-password',
          params: {
            ...forwardAfterOtp(),
            flow: 'register',
            returnRoute: postOtpRoute ?? '/auth/register-passenger',
          },
        });
        return;
      }

      router.replace({
        pathname: '/auth/create-password',
        params: forwardAfterOtp(),
      });
    });
  };

  const showDuiStep = isAdminFlow && otpVerified;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={isAdminFlow ? 'OTP administrador' : 'Verificación OTP'} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <MoviLogo size="md" style={styles.logo} />
        <Text style={styles.subtitle}>
          {isAdminFlow && !adminOtpConfirmed
            ? 'Solicita el código desde acceso administrador primero.'
            : isAdminFlow && showDuiStep
              ? 'Confirma tu identidad con tu DUI'
              : adminOtpConfirmed || !isAdminFlow
                ? `Código enviado a ${phone}`
                : 'Ingresa el código recibido por SMS'}
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
            {isAdminFlow ? (
              <FormInput
                label="DUI"
                value={dui}
                onChangeText={setDui}
                placeholder="00000000-0"
                hint={FIELD_HINTS.dui}
              />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton title="Verificar" onPress={handleVerifyOtp} loading={loading} />
            {isDevDiagnosticsEnabled() ? (
              <Text style={styles.demo}>Demo OTP: {DEMO_OTP_CODE}</Text>
            ) : null}
            <ContextualHelpLink sectionId="otp-guide" />
          </>
        ) : null}
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
});
