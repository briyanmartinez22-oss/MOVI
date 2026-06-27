import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card, ScreenHeader, StatusBadge, FormInput } from '../../src/components/FormUI';
import { BrandedLoadingView } from '../../src/components/BrandedLoadingView';
import { PrimaryButton } from '../../src/components';
import { useAuth } from '../../src/context/AuthContext';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { getOwnerByUserId } from '../../src/services/profileData';
import { resolveCurrentProfiles } from '../../src/services/profileCache';
import { uploadOwnerDocuments, submitOwnerVerification, updateOwnerProfile } from '../../src/services/api';
import { pickAndUploadDocument } from '../../src/services/uploadService';
import { showError, showSuccess } from '../../src/utils/feedback';
import { colors, typography, spacing, radius } from '../../src/theme';

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

type DocKey = 'duiFront' | 'duiBack' | 'licenseFront' | 'licenseBack';

export default function OwnerAccount() {
  const router = useRouter();
  const { user, logout, refresh, profileRevision } = useAuth();
  const { loading, error: bootstrapError, reload } = useProfileBootstrap('owner');
  const owner = user ? getOwnerByUserId(user.userId) : null;

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);
  const [localDocUrls, setLocalDocUrls] = useState<Partial<Record<DocKey, string>>>({});
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [error, setError] = useState('');
  const profileSyncing = Boolean(user?.role === 'owner' && !owner?.id);
  const resolvedOwnerId = owner?.id ?? resolveCurrentProfiles().owner?.id ?? null;
  const saveProfileDisabled = savingProfile || !resolvedOwnerId;

  useEffect(() => {
    if (owner?.name) {
      const parts = owner.name.trim().split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' ') ?? '');
    }
    setEmail((owner as { email?: string } | null)?.email ?? owner?.email ?? '');
  }, [owner?.name, owner?.email, (owner as { email?: string } | null)?.email]);

  const resetProfileForm = () => {
    if (owner?.name) {
      const parts = owner.name.trim().split(' ');
      setFirstName(parts[0] ?? '');
      setLastName(parts.slice(1).join(' ') ?? '');
    } else {
      setFirstName('');
      setLastName('');
    }
    setEmail(owner?.email ?? (owner as { email?: string } | null)?.email ?? '');
  };

  useEffect(() => {
    if (!owner?.documents) return;
    setLocalDocUrls((prev) => ({ ...owner.documents, ...prev }));
  }, [owner?.documents, profileRevision]);

  const documentType: 'DUI' | 'LICENSE' =
    (owner as { documentType?: string } | null)?.documentType === 'LICENSE' ? 'LICENSE' : 'DUI';

  const docs = DOC_FIELDS_BY_TYPE[documentType];

  const docValues = useMemo<Record<DocKey, string | undefined>>(() => {
    const storedDocs = {
      ...(owner?.documents ?? {}),
      ...localDocUrls,
    };
    return {
      duiFront: storedDocs.duiFront,
      duiBack: storedDocs.duiBack,
      licenseFront: storedDocs.licenseFront,
      licenseBack: storedDocs.licenseBack,
    };
  }, [owner?.documents, localDocUrls, profileRevision]);

  const allDocsUploaded = docs.every((d) => Boolean(docValues[d.key]));
  const canSubmitVerification =
    Boolean(owner?.id) && allDocsUploaded && !submittingVerification && owner?.status !== 'approved';

  useEffect(() => {
    console.log('[OWNER_DOC_UI_DEBUG]', {
      ownerId: owner?.id ?? null,
      profileRevision,
      documents: docValues,
      allDocsUploaded,
      canSubmitVerification,
      profileSyncing,
      uploadingKey,
      submittingVerification,
    });
  }, [
    owner?.id,
    profileRevision,
    docValues,
    allDocsUploaded,
    canSubmitVerification,
    profileSyncing,
    uploadingKey,
    submittingVerification,
  ]);

  const toggleEditing = () => {
    if (editing) {
      resetProfileForm();
      setProfileError('');
      setProfileSuccess('');
    } else {
      setProfileError('');
      setProfileSuccess('');
    }
    setEditing((prev) => !prev);
  };

  const handleSaveProfile = async (ownerId: string) => {
    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
    };

    if (!payload.firstName) {
      const message = 'El nombre es obligatorio.';
      setProfileError(message);
      setProfileSuccess('');
      showError('Datos incompletos', message);
      return;
    }

    setProfileError('');
    setProfileSuccess('');
    setSavingProfile(true);
    console.log('[OWNER_EDIT_DEBUG]', { action: 'save_start', ownerId, payload });
    console.log('[OWNER_SAVE_CLICK_DEBUG]', { action: 'api_request_start', ownerId, payload });

    try {
      const res = await updateOwnerProfile({
        ...payload,
        lastName: payload.lastName || '',
      });
      console.log('[OWNER_EDIT_DEBUG]', {
        action: 'save_result',
        ok: res.ok,
        error: res.error ?? null,
        mappedOwner: res.data?.owner
          ? { id: res.data.owner.id, name: res.data.owner.name, email: res.data.owner.email ?? null }
          : null,
      });

      if (!res.ok) {
        const message = res.error ?? 'No se pudo guardar el perfil.';
        setProfileError(message);
        showError('Error al guardar perfil', message);
        return;
      }

      refresh();
      setEditing(false);
      setProfileSuccess('Perfil actualizado correctamente.');
      showSuccess('Perfil actualizado', 'Tus cambios se guardaron correctamente.');
    } catch (saveError: unknown) {
      const message =
        saveError instanceof Error ? saveError.message : 'No se pudo guardar el perfil.';
      setProfileError(message);
      showError('Error al guardar perfil', message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePress = () => {
    console.log('[OWNER_SAVE_CLICK_DEBUG]', {
      pressed: true,
      saveDisabled: saveProfileDisabled,
      editing,
      savingProfile,
      profileSyncing,
      ownerId: resolvedOwnerId,
      payload: {
        firstName,
        lastName,
        email,
      },
    });

    if (saveProfileDisabled) {
      const message = !resolvedOwnerId
        ? 'Tu perfil de dueño aún se está sincronizando. Intenta de nuevo en unos segundos.'
        : 'Guardado en progreso…';
      setProfileError(message);
      setProfileSuccess('');
      if (!resolvedOwnerId) {
        showError('Perfil no listo', message);
      }
      return;
    }

    void handleSaveProfile(resolvedOwnerId);
  };

  if (loading) return <BrandedLoadingView message="Cargando…" />;

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro de que deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const statusLabel =
    owner?.status === 'approved' ? 'Aprobado'
    : owner?.status === 'suspended' ? 'Suspendido'
    : owner?.status === 'rejected' ? 'Rechazado'
    : owner?.status === 'pending' ? 'Pendiente'
    : owner?.status ?? 'Desconocido';

  const phoneValue = owner?.phone ?? (user as { phone?: string } | null)?.phone ?? user?.phoneNumber ?? '—';

  const uploadDoc = async (key: DocKey) => {
    const id = resolvedOwnerId;
    if (!id) {
      setError('Tu perfil de dueño aún se está sincronizando. Intenta de nuevo en unos segundos.');
      return;
    }

    setError('');
    setUploadingKey(key);
    try {
      const url = await pickAndUploadDocument(key);
      if (!url) {
        setUploadingKey(null);
        return;
      }
      const saveRes = await uploadOwnerDocuments(id, { [key]: url });
      if (!saveRes.ok) {
        const saveMessage = saveRes.error ?? 'No se pudo guardar el documento en tu perfil.';
        setError(saveMessage);
        Alert.alert('Error al guardar documento', saveMessage);
        return;
      }
      setLocalDocUrls((prev) => ({
        ...prev,
        ...(saveRes.data?.documents ?? {}),
        [key]: url,
      }));
      refresh();
      Alert.alert('Documento subido', 'El documento fue cargado correctamente.');
    } catch (e: unknown) {
      const err = e as { message?: string };
      const message =
        err?.message === 'MEDIA_LIBRARY_PERMISSION_DENIED'
          ? 'La app no tiene permiso para abrir la galería.'
          : err?.message?.startsWith('WEB_FILE_FETCH_')
            ? 'La imagen fue seleccionada, pero el navegador no permitió convertirla al archivo que se sube.'
            : err?.message === 'Archivo requerido (campo: file)'
              ? 'La petición llegó al servidor, pero el archivo no viajó dentro del formulario.'
              : err?.message?.startsWith('UPLOAD_HTTP_')
                ? 'El servidor rechazó la subida del archivo.'
                : err?.message === 'UPLOAD_NO_URL_RETURNED'
                  ? 'El servidor recibió el archivo, pero no devolvió la URL.'
                  : err?.message?.startsWith('UPLOAD_BAD_RESPONSE_')
                    ? 'El servidor devolvió una respuesta inválida al subir el archivo.'
                    : `Falló la subida del archivo: ${err?.message ?? 'error desconocido'}`;
      setError(message);
      Alert.alert('Error al subir documento', message);
    } finally {
      setUploadingKey(null);
    }
  };

  const handleSubmitVerification = async () => {
    const id = owner?.id;
    if (!id) {
      setError('Tu perfil de dueño aún se está sincronizando. Intenta de nuevo en unos segundos.');
      return;
    }
    if (!allDocsUploaded) {
      setError('Debes subir ambos lados del documento antes de enviar la verificación.');
      return;
    }

    setError('');
    setSubmittingVerification(true);
    try {
      const res = await submitOwnerVerification(id);
      if (!res.ok) {
        setError(res.error ?? 'No se pudo enviar la verificación');
        return;
      }
      refresh();
      Alert.alert(
        'Verificación enviada',
        'Tus documentos fueron enviados para revisión del equipo MOVI.'
      );
    } catch {
      setError('No se pudo enviar la verificación.');
    } finally {
      setSubmittingVerification(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Mi cuenta" />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.name}>{owner?.name ?? user?.fullName ?? '—'}</Text>
          <Text style={styles.phone}>{phoneValue}</Text>
          {profileSyncing ? (
            <Text style={styles.syncHint}>
              Estamos sincronizando tu perfil de dueño. Tu cuenta existe, pero los datos aún se están cargando.
            </Text>
          ) : null}
          {bootstrapError ? <Text style={styles.error}>{bootstrapError}</Text> : null}
          <StatusBadge status={statusLabel} />
        </Card>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Perfil</Text>
          <TouchableOpacity onPress={toggleEditing}>
            <Text style={styles.linkText}>{editing ? 'Cancelar' : 'Editar'}</Text>
          </TouchableOpacity>
        </View>

        <Card>
          {editing ? (
            <>
              <FormInput label="Nombres" value={firstName} onChangeText={setFirstName} placeholder="Nombre" />
              <FormInput label="Apellidos" value={lastName} onChangeText={setLastName} placeholder="Apellido" />
              <FormInput label="Correo" value={email} onChangeText={setEmail} placeholder="correo@ejemplo.com" />
              {!resolvedOwnerId ? (
                <Text style={styles.profileHint}>
                  Tu perfil de dueño aún se está sincronizando. Guardar estará disponible en unos segundos.
                </Text>
              ) : null}
              {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
              {profileSuccess ? <Text style={styles.success}>{profileSuccess}</Text> : null}
              <PrimaryButton
                title={savingProfile ? 'Guardando…' : 'Guardar cambios'}
                onPress={handleSavePress}
                loading={savingProfile}
                disabled={saveProfileDisabled}
                style={{ marginTop: spacing.md }}
              />
            </>
          ) : (
            <>
              {profileSuccess ? <Text style={styles.success}>{profileSuccess}</Text> : null}
              <InfoRow label="Nombre" value={owner?.name ?? '—'} />
              <InfoRow label="Teléfono" value={phoneValue} />
              <InfoRow label="Correo" value={owner?.email ?? 'No registrado'} />
              <InfoRow label="DUI" value={owner?.dui ?? '—'} />
              <InfoRow label="Tipo de documento" value={documentType === 'DUI' ? 'DUI' : 'Licencia'} />
            </>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Documentos</Text>
        <Card>
          <Text style={styles.docHint}>
            Aquí puedes ver, subir o reemplazar tus documentos si algo falló durante el registro.
          </Text>

          {docs.map((doc) => {
            const uploaded = Boolean(docValues[doc.key]);
            const uploading = uploadingKey === doc.key;
            const docsDisabled = profileSyncing || uploading;

            return (
              <TouchableOpacity
                key={doc.key}
                style={[
                  styles.docBtn,
                  uploaded ? styles.docBtnDone : styles.docBtnPending,
                  uploading && styles.docBtnUploading,
                ]}
                onPress={() => uploadDoc(doc.key)}
                disabled={docsDisabled}
                activeOpacity={0.75}
              >
                <View style={styles.docLeft}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons
                      name={uploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
                      size={22}
                      color={uploaded ? colors.online : colors.textSecondary}
                    />
                  )}
                  <View style={styles.docTexts}>
                    <Text style={[styles.docLabel, uploaded && styles.docLabelDone]}>{doc.label}</Text>
                    <Text style={[styles.docStatus, uploaded && styles.docStatusDone]}>
                      {uploading
                        ? 'Subiendo…'
                        : uploaded
                          ? 'Subido · tocar para reemplazar'
                          : 'Pendiente · tocar para subir'}
                    </Text>
                  </View>
                </View>
                <Ionicons
                  name={uploaded ? 'document-text-outline' : 'chevron-forward'}
                  size={18}
                  color={uploaded ? colors.online : colors.textMuted}
                />
              </TouchableOpacity>
            );
          })}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {profileSyncing ? (
            <TouchableOpacity onPress={() => void reload(true)} style={{ marginTop: spacing.sm }}>
              <Text style={styles.linkText}>Reintentar sincronización</Text>
            </TouchableOpacity>
          ) : null}

          {owner?.status !== 'approved' ? (
            <>
              <PrimaryButton
                title={submittingVerification ? 'Enviando…' : 'Enviar verificación'}
                onPress={handleSubmitVerification}
                loading={submittingVerification}
                disabled={!canSubmitVerification}
                style={{ marginTop: spacing.md }}
              />
              {!allDocsUploaded ? (
                <Text style={styles.verifyHint}>
                  Sube los {docs.length} documentos requeridos para enviar tu verificación.
                </Text>
              ) : null}
            </>
          ) : (
            <Text style={styles.verifyHint}>Tu verificación fue aprobada.</Text>
          )}
        </Card>

        <Text style={styles.sectionTitle}>Acciones</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/notifications' as never)}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
          <Text style={styles.menuText}>Notificaciones</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.menuItem, styles.logoutItem]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color={colors.danger} />
          <Text style={[styles.menuText, { color: colors.danger }]}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  label: { ...typography.caption, color: colors.textSecondary },
  value: { ...typography.body, color: colors.text, textAlign: 'right', maxWidth: '60%' },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  profileCard: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.subtitle, color: colors.text },
  phone: { ...typography.body, color: colors.textSecondary },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  sectionTitle: { ...typography.subtitle, color: colors.text },
  linkText: { ...typography.body, color: colors.brandRed },
  profileHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  docHint: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  docBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
  },
  docBtnPending: {
    backgroundColor: colors.borderLight,
    borderColor: colors.borderLight,
  },
  docBtnDone: {
    backgroundColor: colors.surface,
    borderColor: colors.online,
  },
  docBtnUploading: {
    opacity: 0.85,
  },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  syncHint: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  docTexts: { flex: 1, gap: 2 },
  docLabel: { ...typography.body, color: colors.text },
  docLabelDone: { color: colors.text },
  docStatus: { ...typography.caption, color: colors.textSecondary },
  docStatusDone: { color: colors.online },
  error: { ...typography.caption, color: colors.danger, marginTop: spacing.sm },
  success: { ...typography.caption, color: colors.online, marginTop: spacing.sm },
  verifyHint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  logoutItem: { marginTop: spacing.sm },
  menuText: { ...typography.body, color: colors.text, flex: 1 },
});
