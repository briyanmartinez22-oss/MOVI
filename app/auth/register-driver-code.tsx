import { useState } from 'react';
import { Text, StyleSheet, TouchableOpacity, View, ActivityIndicator, Alert, Animated } from 'react-native';
import { useRef, useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, LegalConsentCheckbox } from '../../src/components';
import { validateRegistrationConsent } from '../../src/utils/registrationConsent';
import { Card, FormInput, ScreenHeader } from '../../src/components/FormUI';
import { KeyboardAwareScreen } from '../../src/components/KeyboardAwareScreen';
import { LoadingTimeoutBanner } from '../../src/components/LoadingTimeoutBanner';
import { useAuth } from '../../src/context/AuthContext';
import { validateDriverInviteCode } from '../../src/services/api';
import { useMockApi } from '../../src/services/api/config';
import { fetchInvitePreview, getInvitePreview } from '../../src/services/mockApi';
import { useAsyncAction } from '../../src/utils/asyncAction';
import { showSuccess } from '../../src/utils/feedback';
import { FIELD_HINTS } from '../../src/data/fieldHints';
import { normalizePhone } from '../../src/utils/platform';
import { consumeRegistrationPassword } from '../../src/services/registrationPasswordDraft';
import { pickAndUploadDocument } from '../../src/services/uploadService';
import { colors, typography, spacing } from '../../src/theme';

const INVITE_ERROR_LABELS: Record<string, string> = {
  INVITE_INVALID: 'Código inválido o no disponible.',
  INVITE_EXPIRED: 'Este código expiró.',
  INVITE_USED: 'Este código ya fue utilizado.',
  OWNER_SUSPENDED: 'El dueño de esta unidad está suspendido.',
  VEHICLE_DISABLED: 'Esta unidad no está disponible para registro.',
};

type InvitePreview = {
  invite?: { code?: string; expiresAt?: string };
  vehicle?: {
    brand?: string;
    model?: string;
    year?: number;
    platePartial?: string;
    vehicleType?: string;
  };
  owner?: { name?: string; firstName?: string; lastName?: string };
};

type Step = 'code' | 'preview' | 'form';

export default function RegisterDriverCodeScreen() {
  const router = useRouter();
  const { phone, verified, password: passwordParam } = useLocalSearchParams<{ phone: string; verified?: string; password?: string }>();
  const { registerDriverWithCode } = useAuth();

  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [licenseFront, setLicenseFront] = useState('');
  const [licenseBack, setLicenseBack] = useState('');
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction();

  const handleValidateCode = async () => {
    if (!code.trim()) {
      setError('Ingresa el código de invitación');
      return;
    }
    setError('');
    if (useMockApi()) {
      const data = getInvitePreview(code.trim());
      if (!data) {
        setError('Código inválido, expirado o ya utilizado');
        return;
      }
      setPreview(data as InvitePreview);
      setStep('preview');
      return;
    }
    const res = await validateDriverInviteCode(code.trim());
    if (!res.ok) {
      setError(INVITE_ERROR_LABELS[res.code ?? ''] ?? res.error ?? 'Código inválido');
      return;
    }
    setPreview(res.data as InvitePreview);
    setStep('preview');
  };

  const uploadLicense = async (side: 'front' | 'back') => {
    const setUploading = side === 'front' ? setUploadingFront : setUploadingBack;
    setUploading(true);
    setError('');
    try {
      const url = await pickAndUploadDocument(
        side === 'front' ? 'licenseFront' : 'licenseBack'
      );
      if (!url) {
        setUploading(false);
        return;
      }
      if (side === 'front') setLicenseFront(url);
      else setLicenseBack(url);
    } catch {
      Alert.alert(
        'Error al subir foto',
        'No se pudo subir la imagen. Verifica que la app tiene permiso para acceder a tu galería e intenta de nuevo.',
        [{ text: 'Entendido' }]
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRegister = async () => {
    if (verified !== '1') {
      setError('Verifica tu teléfono antes de continuar');
      return;
    }
    if (!firstName.trim() || !lastName.trim()) {
      setError('Completa nombre y apellidos');
      return;
    }
    if (!licenseFront || !licenseBack) {
      setError('Sube licencia frontal y trasera');
      return;
    }
    const consentError = validateRegistrationConsent({ termsAccepted, privacyAccepted }, false);
    if (consentError) {
      setError(consentError);
      return;
    }
    setError('');
    await run(async () => {
      const resolvedPassword =
        passwordParam?.trim() || (await consumeRegistrationPassword(phone ?? ''));
      if (!resolvedPassword) {
        setError('Falta la contraseña. Repite el flujo desde OTP.');
        return;
      }
      const res = await registerDriverWithCode({
        phone: normalizePhone(phone ?? ''),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        birthDate: birthDate.trim() || undefined,
        code: code.trim(),
        licenseFront,
        licenseBack,
        password: resolvedPassword,
      });
      if (res.ok) {
        showSuccess('Registro enviado', 'Un administrador revisará tu licencia antes de activarte.');
        router.replace('/onboarding/driver');
      } else setError(res.error ?? 'Error al registrar');
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Registro conductor" />
      <KeyboardAwareScreen scroll contentContainerStyle={styles.content}>
        <LoadingTimeoutBanner visible={timedOut} onRetry={retry} />

        {step === 'code' && (
          <>
            <Text style={styles.hint}>Paso 1 — Ingresa el código de invitación del vehículo.</Text>
            <FormInput
              label="Código de invitación"
              value={code}
              onChangeText={setCode}
              placeholder="MV-AB12XY"
              hint={FIELD_HINTS.inviteCode}
            />
            <PrimaryButton title="Validar código" onPress={() => void handleValidateCode()} loading={loading} />
          </>
        )}

        {step === 'preview' && preview && (
          <>
            <Text style={styles.section}>Vehículo asignado</Text>
            <Card>
              <Text style={styles.label}>
                {preview.vehicle?.brand ?? '—'} {preview.vehicle?.model ?? ''}{' '}
                {preview.vehicle?.year ?? ''}
              </Text>
              <Text style={styles.label}>Placa: {preview.vehicle?.platePartial ?? '—'}</Text>
            </Card>
            <Text style={styles.section}>Dueño</Text>
            <Card>
              <Text style={styles.label}>
                {preview.owner?.name ??
                  `${preview.owner?.firstName ?? ''} ${preview.owner?.lastName ?? ''}`.trim()}
              </Text>
            </Card>
            <PrimaryButton title="Continuar" onPress={() => setStep('form')} style={{ marginTop: spacing.lg }} />
            <PrimaryButton title="Cambiar código" onPress={() => setStep('code')} variant="outline" />
          </>
        )}

        {step === 'form' && (
          <>
            <Text style={styles.hint}>Paso 2 — Datos personales y licencia de conducir.</Text>
            <FormInput label="Nombres" value={firstName} onChangeText={setFirstName} placeholder="José" />
            <FormInput label="Apellidos" value={lastName} onChangeText={setLastName} placeholder="Pérez" />
            <Text style={styles.phoneLabel}>Teléfono</Text>
            <Text style={styles.phoneValue}>{phone ?? ''}</Text>
            <FormInput
              label="Correo (opcional)"
              value={email}
              onChangeText={setEmail}
              placeholder="correo@ejemplo.com"
            />
            <FormInput
              label="Fecha de nacimiento (opcional)"
              value={birthDate}
              onChangeText={setBirthDate}
              placeholder="1990-05-15"
            />
            <Text style={styles.section}>Licencia de conducir (obligatoria)</Text>
            {/* Licencia frontal */}
            <TouchableOpacity
              style={[
                styles.docRow,
                licenseFront ? styles.docRowDone : null,
              ]}
              onPress={() => void uploadLicense('front')}
              disabled={uploadingFront}
              activeOpacity={0.7}
            >
              <View style={styles.docLeft}>
                {uploadingFront ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : licenseFront ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
                )}
                <Text style={[styles.docLabel, licenseFront ? styles.docLabelDone : null]}>
                  Licencia — frontal
                </Text>
              </View>
              <Text style={[styles.docAction, licenseFront ? styles.docActionDone : null]}>
                {uploadingFront ? 'Subiendo…' : licenseFront ? 'Subida ✓' : 'Subir foto'}
              </Text>
            </TouchableOpacity>

            {/* Licencia trasera */}
            <TouchableOpacity
              style={[
                styles.docRow,
                licenseBack ? styles.docRowDone : null,
              ]}
              onPress={() => void uploadLicense('back')}
              disabled={uploadingBack}
              activeOpacity={0.7}
            >
              <View style={styles.docLeft}>
                {uploadingBack ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : licenseBack ? (
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  </View>
                ) : (
                  <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
                )}
                <Text style={[styles.docLabel, licenseBack ? styles.docLabelDone : null]}>
                  Licencia — trasera
                </Text>
              </View>
              <Text style={[styles.docAction, licenseBack ? styles.docActionDone : null]}>
                {uploadingBack ? 'Subiendo…' : licenseBack ? 'Subida ✓' : 'Subir foto'}
              </Text>
            </TouchableOpacity>

            {/* Barra de progreso */}
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, licenseFront ? styles.progressDotDone : null]} />
              <View style={[styles.progressLine, (licenseFront && licenseBack) ? styles.progressLineDone : null]} />
              <View style={[styles.progressDot, licenseBack ? styles.progressDotDone : null]} />
            </View>
            <Text style={styles.progressLabel}>
              {!licenseFront && !licenseBack
                ? 'Sube ambas fotos para continuar'
                : !licenseFront
                  ? 'Falta la foto frontal'
                  : !licenseBack
                    ? 'Falta la foto trasera'
                    : '¡Listo! Ya puedes registrarte'}
            </Text>
            <LegalConsentCheckbox
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onTermsChange={setTermsAccepted}
              onPrivacyChange={setPrivacyAccepted}
            />
            <PrimaryButton title="Enviar registro" onPress={() => void handleRegister()} loading={loading} disabled={!licenseFront || !licenseBack || loading} />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </KeyboardAwareScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  hint: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  section: { ...typography.subtitle, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  label: { ...typography.body, color: colors.text, marginTop: spacing.xs },
  error: { color: colors.danger, marginTop: spacing.md },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: spacing.sm,
  },
  docRowDone: {
    backgroundColor: '#22c55e12',
    borderColor: '#22c55e40',
  },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  docLabel: { ...typography.body, color: colors.text },
  docLabelDone: { color: '#15803d', fontWeight: '600' },
  docAction: { ...typography.caption, color: colors.textMuted },
  docActionDone: { color: '#22c55e', fontWeight: '600' },
  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  progressDot: {
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: colors.borderLight,
    borderWidth: 2, borderColor: colors.textMuted,
  },
  progressDotDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  progressLine: { flex: 1, height: 3, backgroundColor: colors.borderLight, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: '#22c55e' },
  progressLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  phoneLabel: { ...typography.caption, color: colors.textMuted },
  phoneValue: { ...typography.body, color: colors.text, marginBottom: spacing.md },
});
