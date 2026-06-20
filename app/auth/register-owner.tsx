import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton, LegalConsentCheckbox, DuiConsentCheckbox } from '../../src/components';
import { validateRegistrationConsent } from '../../src/utils/registrationConsent';
import { Card, FormInput, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { showSuccess } from '../../src/utils/feedback';
import { useAuth } from '../../src/context/AuthContext';
import * as mockApi from '../../src/services/mockApi';
import { getOwnerByUserId } from '../../src/services/profileData';
import { SpecialCaseType } from '../../src/types/models';
import { colors, typography, spacing } from '../../src/theme';

const DOC_FIELDS = [
  { key: 'duiFront', label: 'DUI frente' },
  { key: 'duiBack', label: 'DUI reverso' },
  { key: 'selfie', label: 'Selfie en tiempo real' },
  { key: 'license', label: 'Licencia' },
  { key: 'registrationCard', label: 'Tarjeta de circulación' },
] as const;

export default function RegisterOwnerScreen() {
  const { phone, dui: duiParam, verified, action, consented, name: nameParam } = useLocalSearchParams<{
    phone: string;
    dui: string;
    verified?: string;
    action?: string;
    consented?: string;
    name?: string;
  }>();
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [name, setName] = useState(nameParam ?? '');
  const [termsAccepted, setTermsAccepted] = useState(consented === '1');
  const [privacyAccepted, setPrivacyAccepted] = useState(consented === '1');
  const [duiAccepted, setDuiAccepted] = useState(consented === '1');
  const [step, setStep] = useState<'register' | 'docs' | 'done'>('register');
  const registerStarted = useRef(false);
  const [ownerId, setOwnerId] = useState('');
  const [specialCase, setSpecialCase] = useState<SpecialCaseType | undefined>();
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction();

  const owner = user ? getOwnerByUserId(user.userId) : null;

  const submitRegister = async () => {
    setError('');
    await run(async () => {
      const res = await mockApi.registerOwner(phone ?? '', name.trim(), duiParam ?? '');
      if (res.ok && res.data) {
        refresh();
        setOwnerId(res.data.owner.id);
        setStep('docs');
      } else setError(res.error ?? 'Error');
    });
  };

  useEffect(() => {
    if (action === 'register' && !registerStarted.current) {
      registerStarted.current = true;
      void submitRegister();
    }
  }, [action]);

  const handleRegister = async () => {
    if (!name.trim()) {
      setError('Completa todos los campos');
      return;
    }
    if (verified !== '1') {
      setError('Verifica tu teléfono antes de continuar');
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

  const uploadDoc = async (key: typeof DOC_FIELDS[number]['key']) => {
    const id = ownerId || owner?.id;
    if (!id) return;
    const { pickAndUploadDocument } = await import('../../src/services/uploadService');
    const url = await pickAndUploadDocument(key);
    if (!url) return;
    await mockApi.uploadOwnerDocuments(id, { [key]: url });
    refresh();
  };

  const submitVerification = async () => {
    const id = ownerId || owner?.id;
    if (!id) return;
    await run(async () => {
      await mockApi.submitOwnerVerification(id, specialCase);
      setStep('done');
      refresh();
      showSuccess('Verificación enviada', 'Un administrador revisará tus documentos pronto.');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Registro dueño" />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />
        {step === 'register' && (
          <>
            <Text style={styles.duiLabel}>Teléfono</Text>
            <Text style={styles.duiValue}>{phone ?? ''}</Text>
            <Text style={styles.duiHint}>{FIELD_HINTS.phone}</Text>
            <Text style={styles.duiLabel}>DUI</Text>
            <Text style={styles.duiValue}>{duiParam ?? ''}</Text>
            <Text style={styles.duiHint}>{FIELD_HINTS.dui}</Text>
            <FormInput label="Nombre completo" value={name} onChangeText={setName} placeholder="Roberto Sánchez" hint={FIELD_HINTS.fullName} />
            <LegalConsentCheckbox
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onTermsChange={setTermsAccepted}
              onPrivacyChange={setPrivacyAccepted}
            />
            <DuiConsentCheckbox accepted={duiAccepted} onChange={setDuiAccepted} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <PrimaryButton title="Continuar" onPress={handleRegister} loading={loading} />
          </>
        )}

        {step === 'docs' && (
          <>
            <Text style={styles.sectionTitle}>Verificación de identidad</Text>
            {DOC_FIELDS.map((doc) => (
              <TouchableOpacity key={doc.key} style={styles.docBtn} onPress={() => uploadDoc(doc.key)}>
                <Text style={styles.docLabel}>{doc.label}</Text>
                <Text style={styles.docAction}>Subir foto</Text>
              </TouchableOpacity>
            ))}
            <Text style={styles.sectionTitle}>Caso especial (opcional)</Text>
            {(['manual_review', 'family_authorization', 'company_owner', 'financed_vehicle', 'private_sale_contract', 'power_of_attorney'] as SpecialCaseType[]).map((c) => (
              <TouchableOpacity key={c} style={[styles.docBtn, specialCase === c && styles.docBtnActive]} onPress={() => setSpecialCase(c)}>
                <Text style={styles.docLabel}>{c.replace(/_/g, ' ')}</Text>
              </TouchableOpacity>
            ))}
            <PrimaryButton title="Enviar verificación" onPress={submitVerification} loading={loading} style={{ marginTop: spacing.lg }} />
          </>
        )}

        {step === 'done' && owner && (
          <Card>
            <Text style={styles.sectionTitle}>Verificación enviada</Text>
            <StatusBadge status={owner.status} />
            <Text style={styles.hint}>Un administrador revisará tus documentos.</Text>
            <PrimaryButton title="Ir al dashboard" onPress={() => router.replace('/owner/dashboard')} style={{ marginTop: spacing.lg }} />
          </Card>
        )}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  sectionTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md },
  duiLabel: { ...typography.caption, color: colors.textMuted, marginBottom: 4 },
  duiValue: { ...typography.body, color: colors.text },
  duiHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md, marginTop: 4 },
  docBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  docLabel: { ...typography.body, color: colors.text },
  docAction: { ...typography.caption, color: colors.textSecondary },
  docBtnActive: { borderWidth: 1.5, borderColor: colors.primary },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.md },
});
