import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, LegalConsentCheckbox, DuiConsentCheckbox, MoviLogo } from '../../src/components';
import { FormInput, ScreenHeader } from '../../src/components/FormUI';
import { validateRegistrationConsent } from '../../src/utils/registrationConsent';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { showSuccess } from '../../src/utils/feedback';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { navigateToRegistrationPermissions } from '../../src/utils/registrationNavigation';
import { hasPermissionsAccepted } from '../../src/services/permissionsFlowService';
import { colors, spacing, typography } from '../../src/theme';

export default function RegisterPassengerScreen() {
  const router = useRouter();
  const {
    phone: phoneParam,
    dui: duiParam,
    verified,
    action,
    firstName: firstNameParam,
    lastName: lastNameParam,
    consented,
  } = useLocalSearchParams<{
    phone: string;
    dui: string;
    verified?: string;
    action?: string;
    firstName?: string;
    lastName?: string;
    consented?: string;
  }>();
  const { registerPassenger, requestOtp } = useAuth();
  const [firstName, setFirstName] = useState(firstNameParam ?? '');
  const [lastName, setLastName] = useState(lastNameParam ?? '');
  const [phone, setPhone] = useState(phoneParam ?? '');
  const [dui, setDui] = useState(duiParam ?? '');
  const [termsAccepted, setTermsAccepted] = useState(consented === '1');
  const [privacyAccepted, setPrivacyAccepted] = useState(consented === '1');
  const [duiAccepted, setDuiAccepted] = useState(consented === '1');
  const [error, setError] = useState('');
  const createStarted = useRef(false);
  const { loading, timedOut, run, retry } = useAsyncAction();

  const registrationParams = (): Record<string, string> => ({
    phone,
    dui,
    firstName,
    lastName,
    flow: 'register',
    pendingFlow: 'passenger_register',
    returnRoute: '/auth/register-passenger',
    consented: '1',
  });

  useEffect(() => {
    if (action === 'create' && verified === '1' && !createStarted.current) {
      createStarted.current = true;
      void handleCreateAccount();
    }
  }, [action, verified]);

  const handleContinue = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Ingresa nombre y apellido');
      return;
    }
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Ingresa un teléfono válido');
      return;
    }
    if (!dui.trim()) {
      setError('Ingresa tu DUI');
      return;
    }
    const consentError = validateRegistrationConsent(
      { termsAccepted, privacyAccepted },
      duiAccepted
    );
    if (consentError) {
      setError(consentError);
      return;
    }

    setError('');

    if (verified === '1') {
      void handleCreateAccount();
      return;
    }

    const forward = registrationParams();

    if (await hasPermissionsAccepted('passenger_register')) {
      const otpRes = await requestOtp(phone);
      if (!otpRes.ok) {
        setError(otpRes.error ?? 'No se pudo enviar el OTP');
        return;
      }
      router.replace({ pathname: '/auth/otp' as never, params: forward });
      return;
    }

    await navigateToRegistrationPermissions(router, {
      pendingFlow: 'passenger_register',
      nextRoute: '/auth/otp',
      forwardParams: forward,
    });
  };

  const handleCreateAccount = async () => {
    setError('');
    await run(async () => {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const res = await registerPassenger(phone, dui, fullName);
      if (res.ok) {
        showSuccess('¡Bienvenido!', 'Tu cuenta de pasajero fue creada.');
        router.replace('/passenger');
      } else {
        setError(res.error ?? 'Error al registrar');
      }
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Registro pasajero" onBack={() => router.replace('/auth/register-account')} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <MoviLogo size="md" style={styles.logo} />
        <Text style={styles.intro}>Crear cuenta PASAJERO</Text>
        <FormInput label="Nombre" value={firstName} onChangeText={setFirstName} placeholder="María" />
        <FormInput label="Apellido" value={lastName} onChangeText={setLastName} placeholder="García" />
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
        <LegalConsentCheckbox
          termsAccepted={termsAccepted}
          privacyAccepted={privacyAccepted}
          onTermsChange={setTermsAccepted}
          onPrivacyChange={setPrivacyAccepted}
        />
        <DuiConsentCheckbox accepted={duiAccepted} onChange={setDuiAccepted} />
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton
          title={verified === '1' ? 'Crear cuenta' : 'Continuar'}
          onPress={handleContinue}
          loading={loading}
        />
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
