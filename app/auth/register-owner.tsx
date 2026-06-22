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
import { uploadOwnerDocuments, submitOwnerVerification } from '../../src/services/api';
import { resolveCurrentProfiles } from '../../src/services/profileCache';
import { getOwnerByUserId } from '../../src/services/profileData';
import { ContextualHelpLink } from '../../src/components/help/ContextualHelpLink';
import { SpecialCaseType } from '../../src/types/models';
import { colors, typography, spacing } from '../../src/theme';

const DOC_FIELDS_BY_TYPE = {
  DUI: [
    { key: 'duiFront' as const, label: 'DUI — frontal' },
    { key: 'duiBack' as const, label: 'DUI — trasera' },
  ],
  LICENSE: [
    { key: 'licenseFront' as const, label: 'Licencia — frontal' },
    { key: 'licenseBack' as const, label: 'Licencia — trasera' },
  ],
};

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
  const { user, refresh, registerOwner } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [documentType, setDocumentType] = useState<'DUI' | 'LICENSE'>('DUI');
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
      const res = await registerOwner(
        phone ?? '',
        firstName.trim(),
        lastName.trim(),
        duiParam ?? '',
        email.trim() || undefined,
        documentType
      );
      if (res.ok) {
        refresh();
        const cachedOwner = resolveCurrentProfiles().owner;
        if (cachedOwner) setOwnerId(cachedOwner.id);
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
    if (!firstName.trim() || !lastName.trim()) {
      setError('Completa nombres y apellidos');
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

  const uploadDoc = async (key: 'duiFront' | 'duiBack' | 'licenseFront' | 'licenseBack') => {
    const id = ownerId || owner?.id;
    if (!id) return;
    const { pickAndUploadDocument } = await import('../../src/services/uploadService');
    const url = await pickAndUploadDocument(key);
    if (!url) return;
    await uploadOwnerDocuments(id, { [key]: url });
    refresh();
  };

  const submitVerification = async () => {
    const id = ownerId || owner?.id;
    if (!id) return;
    await run(async () => {
      const res = await submitOwnerVerification(id, specialCase);
      if (!res.ok) {
        setError(res.error ?? 'Error al enviar verificación');
        return;
      }
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
            <FormInput label="Nombres" value={firstName} onChangeText={setFirstName} placeholder="Roberto" />
            <FormInput label="Apellidos" value={lastName} onChangeText={setLastName} placeholder="Sánchez" />
            <FormInput
              label="Correo (opcional)"
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
            />
            <Text style={styles.duiLabel}>Tipo de documento</Text>
            <View style={styles.row}>
              {(['DUI', 'LICENSE'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, documentType === t && styles.typeBtnActive]}
                  onPress={() => setDocumentType(t)}
                >
                  <Text style={styles.typeBtnText}>{t === 'DUI' ? 'DUI' : 'Licencia'}</Text>
                </TouchableOpacity>
              ))}
            </View>
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
            {DOC_FIELDS_BY_TYPE[documentType].map((doc) => (
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
        <ContextualHelpLink sectionId="driver-guide" />
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
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  typeBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
  },
  typeBtnActive: { borderWidth: 1.5, borderColor: colors.primary },
  typeBtnText: { ...typography.caption, color: colors.text },
});
