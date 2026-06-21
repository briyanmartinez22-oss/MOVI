import { useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, MoviLogo } from '../../src/components';
import { FormInput, ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { navigateToRegistrationPermissions } from '../../src/utils/registrationNavigation';
import {
  hasPermissionsAccepted,
  type PendingRegistrationFlow,
} from '../../src/services/permissionsFlowService';
import { isValidMoviPhone } from '../../src/utils/platform';
import { colors, spacing, typography } from '../../src/theme';

function isPendingFlow(value: string | undefined): value is PendingRegistrationFlow {
  return (
    value === 'owner_register' ||
    value === 'driver_register' ||
    value === 'business_register'
  );
}

export default function RegisterIdentityScreen() {
  const router = useRouter();
  const { returnRoute, pendingFlow: pendingFlowParam } = useLocalSearchParams<{
    returnRoute: string;
    pendingFlow: string;
  }>();
  const { requestOtp } = useAuth();
  const [phone, setPhone] = useState('');
  const [dui, setDui] = useState('');
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction();

  const pendingFlow = isPendingFlow(pendingFlowParam) ? pendingFlowParam : undefined;

  const handleContinue = async () => {
    if (!isValidMoviPhone(phone)) {
      setError('Ingresa un teléfono válido (+503 o +1)');
      return;
    }
    if (!dui.trim()) {
      setError('Ingresa tu DUI');
      return;
    }
    if (!pendingFlow || !returnRoute) {
      setError('Flujo de registro inválido');
      return;
    }

    setError('');
    const forward: Record<string, string> = {
      phone,
      dui,
      flow: 'register',
      returnRoute,
      pendingFlow,
    };

    await run(async () => {
      if (await hasPermissionsAccepted(pendingFlow)) {
        const otpRes = await requestOtp(phone);
        if (!otpRes.ok) {
          setError(otpRes.error ?? 'No se pudo enviar el OTP');
          return;
        }
        router.replace({ pathname: '/auth/otp' as never, params: forward });
        return;
      }

      await navigateToRegistrationPermissions(router, {
        pendingFlow,
        nextRoute: '/auth/otp',
        forwardParams: forward,
      });
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Verificar identidad" onBack={() => router.back()} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <MoviLogo size="md" style={styles.logo} />
        <Text style={styles.intro}>Ingresa tu teléfono y DUI para continuar</Text>
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
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Continuar" onPress={handleContinue} loading={loading} />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, alignItems: 'center' },
  logo: { marginBottom: spacing.md },
  intro: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md, alignSelf: 'stretch' },
  error: { color: colors.danger, marginBottom: spacing.md },
});
