import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, VehicleBadge, LegalConsentCheckbox, DuiConsentCheckbox } from '../../src/components';
import { validateRegistrationConsent } from '../../src/utils/registrationConsent';
import { Card, FormInput, ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { fetchInvitePreview, getInvitePreview } from '../../src/services/mockApi';
import { useMockApi } from '../../src/services/api/config';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { showSuccess } from '../../src/utils/feedback';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { colors, typography, spacing } from '../../src/theme';

export default function RegisterDriverCodeScreen() {
  const router = useRouter();
  const { phone, dui, verified, action, consented, name: nameParam, code: codeParam } = useLocalSearchParams<{
    phone: string;
    dui: string;
    verified?: string;
    action?: string;
    consented?: string;
    name?: string;
    code?: string;
  }>();
  const { registerDriverWithCode } = useAuth();
  const [name, setName] = useState(nameParam ?? '');
  const [code, setCode] = useState(codeParam ?? '');
  const [preview, setPreview] = useState<ReturnType<typeof getInvitePreview>>(null);
  const [termsAccepted, setTermsAccepted] = useState(consented === '1');
  const [privacyAccepted, setPrivacyAccepted] = useState(consented === '1');
  const [duiAccepted, setDuiAccepted] = useState(consented === '1');
  const [error, setError] = useState('');
  const registerStarted = useRef(false);
  const { loading, timedOut, run, retry } = useAsyncAction();

  useEffect(() => {
    if (!codeParam?.trim()) return;
    if (useMockApi()) {
      const data = getInvitePreview(codeParam.trim());
      if (data) setPreview(data);
      return;
    }
    void fetchInvitePreview(codeParam.trim()).then((data) => {
      if (data) setPreview(data);
    });
  }, [codeParam]);

  const handlePreview = async () => {
    if (useMockApi()) {
      const data = getInvitePreview(code.trim());
      if (!data) {
        setError('Código inválido o ya utilizado');
        setPreview(null);
        return;
      }
      setError('');
      setPreview(data);
      return;
    }

    setError('');
    const data = await fetchInvitePreview(code.trim());
    if (!data) {
      setError('Código inválido o ya utilizado');
      setPreview(null);
      return;
    }
    setPreview(data);
  };

  const submitRegister = async () => {
    setError('');
    await run(async () => {
      const res = await registerDriverWithCode(phone ?? '', dui ?? '', name.trim(), code.trim());
      if (res.ok) {
        showSuccess('¡Registro exitoso!', 'Ya puedes conectarte y recibir solicitudes.');
        router.replace('/onboarding/driver');
      } else setError(res.error ?? 'Error al registrar');
    });
  };

  useEffect(() => {
    if (action === 'register' && !registerStarted.current) {
      registerStarted.current = true;
      void submitRegister();
    }
  }, [action]);

  const handleRegister = async () => {
    if (!name.trim() || !code.trim()) {
      setError('Completa todos los campos');
      return;
    }
    if (verified !== '1') {
      setError('Verifica tu teléfono antes de continuar');
      return;
    }
    if (!preview) {
      setError('Verifica el código de invitación antes de continuar');
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
    void submitRegister();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Registro conductor" />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <Text style={styles.duiLabel}>Teléfono</Text>
        <Text style={styles.duiValue}>{phone ?? ''}</Text>
        <Text style={styles.duiHint}>{FIELD_HINTS.phone}</Text>
        <Text style={styles.hint}>{FIELD_HINTS.inviteCode}</Text>
        <FormInput
          label="Código de invitación"
          value={code}
          onChangeText={setCode}
          placeholder="MOVI-7F91"
          hint={FIELD_HINTS.inviteCode}
        />
        <PrimaryButton title="Ver unidad" onPress={handlePreview} variant="outline" />

        {preview && (
          <Card style={{ marginTop: spacing.lg }}>
            <VehicleBadge type={preview.vehicle.vehicleType} />
            <Text style={styles.label}>Unidad #{preview.vehicle.unitNumber}</Text>
            <Text style={styles.label}>ID: {preview.vehicle.unitId}</Text>
            <Text style={styles.label}>Placa {preview.vehicle.plateNumber}</Text>
            <Text style={styles.label}>Dueño: {preview.owner.name}</Text>
            <Text style={styles.label}>Asociación: {preview.vehicle.associationName}</Text>
          </Card>
        )}

        <FormInput
          label="Tu nombre"
          value={name}
          onChangeText={setName}
          placeholder="José Pérez"
          hint={FIELD_HINTS.fullName}
        />
        <Text style={styles.duiLabel}>DUI</Text>
        <Text style={styles.duiValue}>{dui ?? ''}</Text>
        <Text style={styles.duiHint}>{FIELD_HINTS.dui}</Text>
        <LegalConsentCheckbox
          termsAccepted={termsAccepted}
          privacyAccepted={privacyAccepted}
          onTermsChange={setTermsAccepted}
          onPrivacyChange={setPrivacyAccepted}
        />
        <DuiConsentCheckbox accepted={duiAccepted} onChange={setDuiAccepted} />
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton title="Confirmar y registrarme" onPress={handleRegister} loading={loading} />
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  hint: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  label: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  error: { color: colors.danger, marginBottom: spacing.md },
  duiLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  duiValue: { ...typography.body, color: colors.text },
  duiHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md, marginTop: 4 },
});
