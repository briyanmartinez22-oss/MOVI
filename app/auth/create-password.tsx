import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { FormInput } from '../../src/components/FormUI';
import { ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { validatePasswordPair } from '../../src/utils/passwordValidation';
import { stashRegistrationPassword } from '../../src/services/registrationPasswordDraft';
import { colors, typography, spacing } from '../../src/theme';

type PasswordFlow = 'register' | 'reset' | 'set';

export default function CreatePasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    phone: string;
    flow?: PasswordFlow;
    returnRoute?: string;
    role?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    dui?: string;
    code?: string;
    inviteCode?: string;
    businessName?: string;
    businessPhone?: string;
    businessType?: string;
    nit?: string;
    latitude?: string;
    longitude?: string;
    addressLabel?: string;
    licenseFront?: string;
    licenseBack?: string;
  }>();

  const { resetPassword, setInitialPassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction(15000);

  const flow = (params.flow ?? 'register') as PasswordFlow;

  const handleSubmit = async () => {
    const validationError = validatePasswordPair(password, confirmPassword);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    await run(async () => {
      if (flow === 'reset') {
        const res = await resetPassword(params.phone ?? '', params.code ?? '', password, confirmPassword);
        if (res.ok) {
          router.replace('/auth/login');
        } else {
          setError(res.error ?? 'Error al restablecer contraseña');
        }
        return;
      }

      if (flow === 'set') {
        const res = await setInitialPassword(params.phone ?? '', params.code ?? '', password, confirmPassword);
        if (res.ok) {
          router.replace('/auth/login');
        } else {
          setError(res.error ?? 'Error al crear contraseña');
        }
        return;
      }

      await stashRegistrationPassword(params.phone ?? '', password);

      router.replace({
        pathname: (params.returnRoute ?? '/auth/register-passenger') as never,
        params: {
          ...params,
          verified: '1',
          action: 'create',
        },
      });
    });
  };

  const title =
    flow === 'reset' ? 'Nueva contraseña' : flow === 'set' ? 'Crear contraseña' : 'Crear contraseña';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={title} onBack={() => router.back()} />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Mínimo 8 caracteres, al menos una letra y un número.
        </Text>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        <FormInput
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          placeholder="********"
          secureTextEntry
        />
        <FormInput
          label="Confirmar contraseña"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="********"
          secureTextEntry
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Continuar" onPress={handleSubmit} loading={loading} />
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
