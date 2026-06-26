import { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
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
import {
  getUploadErrorMessage,
  pickAndUploadDocumentDetailed,
  UploadDocumentError,
  type UploadSource,
} from '../../src/services/uploadService';
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

type UploadUiStatus = 'idle' | 'uploading' | 'success' | 'error';
type LicenseSide = 'front' | 'back';
type StoredUploadState = {
  status: UploadUiStatus;
  remoteUrl: string;
  localUri: string;
  error: string;
  source?: UploadSource;
};

const LICENSE_UPLOAD_DRAFT_PREFIX = 'movi_driver_license_upload_v1';

function createUploadState(remoteUrl = '', localUri = ''): StoredUploadState {
  return {
    status: remoteUrl ? 'success' : 'idle',
    remoteUrl,
    localUri,
    error: '',
  };
}

function restoreUploadState(input: unknown): StoredUploadState {
  if (!input || typeof input !== 'object') return createUploadState();
  const draft = input as Partial<StoredUploadState>;
  const remoteUrl = typeof draft.remoteUrl === 'string' ? draft.remoteUrl : '';
  const localUri = typeof draft.localUri === 'string' ? draft.localUri : '';
  const source =
    draft.source === 'camera' || draft.source === 'library'
      ? draft.source
      : undefined;
  const fallbackStatus: UploadUiStatus = remoteUrl ? 'success' : 'idle';
  const status: UploadUiStatus =
    draft.status === 'idle' ||
    draft.status === 'uploading' ||
    draft.status === 'success' ||
    draft.status === 'error'
      ? draft.status
      : fallbackStatus;

  return {
    status: status === 'uploading' ? fallbackStatus : status,
    remoteUrl,
    localUri,
    error: typeof draft.error === 'string' ? draft.error : '',
    source,
  };
}

function normalizeUploadStateForSave(state: StoredUploadState): StoredUploadState {
  return {
    ...state,
    status: state.status === 'uploading' ? (state.remoteUrl ? 'success' : 'idle') : state.status,
  };
}

function sideLabel(side: LicenseSide): string {
  return side === 'front' ? 'frontal' : 'trasera';
}

type LicenseRowProps = {
  label: string;
  state: StoredUploadState;
  onPress: () => void;
};

function LicenseUploadRow({ label, state, onPress }: LicenseRowProps) {
  const uploading = state.status === 'uploading';
  const uploaded = state.status === 'success';
  const failed = state.status === 'error';
  const previewUri = state.localUri || state.remoteUrl;
  const actionLabel = uploading
    ? 'Subiendo...'
    : uploaded
      ? 'Foto subida'
      : failed
        ? 'Reintentar'
        : 'Subir foto';

  return (
    <View style={styles.docRowWrap}>
      <TouchableOpacity
        style={[
          styles.docRow,
          uploaded ? styles.docRowDone : null,
          failed ? styles.docRowError : null,
        ]}
        onPress={onPress}
        disabled={uploading}
        activeOpacity={0.7}
      >
        <View style={styles.docLeft}>
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : uploaded ? (
            <View style={styles.checkCircle}>
              <Ionicons name="checkmark" size={13} color="#fff" />
            </View>
          ) : failed ? (
            <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
          ) : (
            <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
          )}
          <Text
            style={[
              styles.docLabel,
              uploaded ? styles.docLabelDone : null,
              failed ? styles.docLabelError : null,
            ]}
          >
            {label}
          </Text>
        </View>
        <Text
          style={[
            styles.docAction,
            uploaded ? styles.docActionDone : null,
            failed ? styles.docActionError : null,
          ]}
        >
          {actionLabel}
        </Text>
      </TouchableOpacity>
      {uploaded && previewUri ? (
        <View style={styles.previewCard}>
          <Image source={{ uri: previewUri }} style={styles.previewImage} />
          <Text style={styles.previewLabel}>Vista previa</Text>
        </View>
      ) : null}
      {failed && state.error ? <Text style={styles.rowError}>{state.error}</Text> : null}
    </View>
  );
}

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
  const [frontUpload, setFrontUpload] = useState<StoredUploadState>(createUploadState());
  const [backUpload, setBackUpload] = useState<StoredUploadState>(createUploadState());
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState('');
  const { loading, timedOut, run, retry } = useAsyncAction();
  const licenseFront = frontUpload.remoteUrl;
  const licenseBack = backUpload.remoteUrl;
  const bothUploaded = Boolean(licenseFront && licenseBack);
  const uploadDraftKey = useMemo(() => {
    const normalizedPhone = normalizePhone(phone ?? '');
    const normalizedCode = code.trim().toUpperCase() || 'pending';
    return `${LICENSE_UPLOAD_DRAFT_PREFIX}:${normalizedPhone}:${normalizedCode}`;
  }, [phone, code]);

  useEffect(() => {
    let active = true;
    const loadDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(uploadDraftKey);
        if (!active) return;
        if (!raw) {
          setFrontUpload(createUploadState());
          setBackUpload(createUploadState());
          return;
        }
        const parsed = JSON.parse(raw) as { front?: unknown; back?: unknown };
        const restoredFront = restoreUploadState(parsed.front);
        const restoredBack = restoreUploadState(parsed.back);
        setFrontUpload(restoredFront);
        setBackUpload(restoredBack);
        console.log('[register-driver-code] restored-upload-draft', {
          key: uploadDraftKey,
          hasFront: Boolean(restoredFront.remoteUrl),
          hasBack: Boolean(restoredBack.remoteUrl),
        });
      } catch (draftError) {
        console.error('[register-driver-code] failed-to-restore-upload-draft', draftError);
      }
    };
    void loadDraft();
    return () => {
      active = false;
    };
  }, [uploadDraftKey]);

  useEffect(() => {
    const saveDraft = async () => {
      try {
        const payload = {
          front: normalizeUploadStateForSave(frontUpload),
          back: normalizeUploadStateForSave(backUpload),
        };
        const shouldClear =
          payload.front.status === 'idle' &&
          payload.back.status === 'idle' &&
          !payload.front.remoteUrl &&
          !payload.back.remoteUrl &&
          !payload.front.error &&
          !payload.back.error;
        if (shouldClear) {
          await AsyncStorage.removeItem(uploadDraftKey);
          return;
        }
        await AsyncStorage.setItem(uploadDraftKey, JSON.stringify(payload));
      } catch (draftError) {
        console.error('[register-driver-code] failed-to-save-upload-draft', draftError);
      }
    };
    void saveDraft();
  }, [backUpload, frontUpload, uploadDraftKey]);

  const selectUploadSource = async (): Promise<UploadSource | null> => {
    if (Platform.OS === 'web') return 'library';
    return new Promise((resolve) => {
      let settled = false;
      const complete = (value: UploadSource | null) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      Alert.alert(
        'Selecciona origen',
        'Puedes tomar una foto o elegir una imagen de tu galería.',
        [
          { text: 'Tomar foto', onPress: () => complete('camera') },
          { text: 'Elegir de galería', onPress: () => complete('library') },
          { text: 'Cancelar', style: 'cancel', onPress: () => complete(null) },
        ],
        { cancelable: true, onDismiss: () => complete(null) }
      );
    });
  };

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

  const uploadLicense = async (side: LicenseSide) => {
    const setUploadState = side === 'front' ? setFrontUpload : setBackUpload;
    setUploadState((prev) => ({ ...prev, status: 'uploading', error: '' }));
    setError('');
    const source = await selectUploadSource();
    if (!source) {
      setUploadState((prev) => ({
        ...prev,
        status: prev.remoteUrl ? 'success' : 'idle',
        error: '',
      }));
      return;
    }

    try {
      const uploaded = await pickAndUploadDocumentDetailed({
        documentType: side === 'front' ? 'licenseFront' : 'licenseBack',
        source,
      });
      if (!uploaded) {
        setUploadState((prev) => ({
          ...prev,
          status: prev.remoteUrl ? 'success' : 'idle',
        }));
        return;
      }
      setUploadState({
        status: 'success',
        remoteUrl: uploaded.url,
        localUri: uploaded.localUri,
        error: '',
        source: uploaded.source,
      });
      console.log('[register-driver-code] license-upload-success', {
        side,
        source: uploaded.source,
        endpoint: uploaded.endpoint,
        provider: uploaded.provider ?? 'unknown',
        storageKey: uploaded.storageKey ?? null,
      });
    } catch (uploadError) {
      const uploadMessage = getUploadErrorMessage(uploadError);
      console.error('[register-driver-code] license-upload-failed', {
        side,
        stage: uploadError instanceof UploadDocumentError ? uploadError.stage : 'unknown',
        message: uploadMessage,
        error: uploadError,
      });
      setUploadState((prev) => ({
        ...prev,
        status: 'error',
        error: uploadMessage,
      }));
      setError(`Error en licencia ${sideLabel(side)}: ${uploadMessage}`);
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
    if (!bothUploaded) {
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
        await AsyncStorage.removeItem(uploadDraftKey).catch(() => undefined);
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
            <LicenseUploadRow
              label="Licencia — frontal"
              state={frontUpload}
              onPress={() => void uploadLicense('front')}
            />

            {/* Licencia trasera */}
            <LicenseUploadRow
              label="Licencia — trasera"
              state={backUpload}
              onPress={() => void uploadLicense('back')}
            />

            {/* Barra de progreso */}
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, frontUpload.status === 'success' ? styles.progressDotDone : null]} />
              <View style={[styles.progressLine, bothUploaded ? styles.progressLineDone : null]} />
              <View style={[styles.progressDot, backUpload.status === 'success' ? styles.progressDotDone : null]} />
            </View>
            <Text style={styles.progressLabel}>
              {!frontUpload.remoteUrl && !backUpload.remoteUrl
                ? 'Sube ambas fotos para continuar'
                : !frontUpload.remoteUrl
                  ? 'Falta la foto frontal'
                  : !backUpload.remoteUrl
                    ? 'Falta la foto trasera'
                    : '¡Listo! Ya puedes enviar la verificación'}
            </Text>
            <LegalConsentCheckbox
              termsAccepted={termsAccepted}
              privacyAccepted={privacyAccepted}
              onTermsChange={setTermsAccepted}
              onPrivacyChange={setPrivacyAccepted}
            />
            <PrimaryButton
              title={bothUploaded ? 'Enviar verificación' : 'Sube ambas fotos para continuar'}
              onPress={() => void handleRegister()}
              loading={loading}
              disabled={!bothUploaded || loading}
            />
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
  docRowWrap: { marginBottom: spacing.sm },
  docRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  docRowDone: {
    backgroundColor: '#22c55e12',
    borderColor: '#22c55e40',
  },
  docRowError: {
    backgroundColor: `${colors.danger}10`,
    borderColor: `${colors.danger}55`,
  },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  checkCircle: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  docLabel: { ...typography.body, color: colors.text },
  docLabelDone: { color: '#15803d', fontWeight: '600' },
  docLabelError: { color: colors.danger, fontWeight: '600' },
  docAction: { ...typography.caption, color: colors.textMuted },
  docActionDone: { color: '#22c55e', fontWeight: '600' },
  docActionError: { color: colors.danger, fontWeight: '600' },
  rowError: { ...typography.caption, color: colors.danger, marginTop: spacing.xs },
  previewCard: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  previewImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: colors.borderLight,
  },
  previewLabel: { ...typography.caption, color: colors.textSecondary },
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
