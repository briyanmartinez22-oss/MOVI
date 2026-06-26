import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton, VehicleBadge } from '../../src/components';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import { useProfileBootstrap } from '../../src/hooks/useProfileBootstrap';
import { selfAssignOwnerAsDriver } from '../../src/services/api';
import { getVehicle, getOwnerDrivers } from '../../src/services/profileData';
import {
  canVehicleInviteDrivers,
  canVehicleOperate,
  getVehicleApprovalHint,
  getVehicleStatusLabel,
} from '../../src/utils/vehicleStatus';
import {
  canDriverOperateVehicle,
  getDriverApprovalHint,
  getDriverStatusLabel,
  hasDriverLicenseUploaded,
} from '../../src/utils/driverStatus';
import { showError, showSuccess } from '../../src/utils/feedback';
import { colors, typography, spacing, radius } from '../../src/theme';

// ── Componente de fila de documento con estado visual ──────────────
type DocRowProps = {
  label: string;
  uploaded: boolean;
  uploading: boolean;
  onPress: () => void;
};

function DocRow({ label, uploaded, uploading, onPress }: DocRowProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (uploaded) {
      // Animación de check al subir
      Animated.sequence([
        Animated.spring(scaleAnim, { toValue: 1.04, useNativeDriver: true, speed: 20 }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]).start();
      Animated.timing(checkOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      checkOpacity.setValue(0);
    }
  }, [uploaded]);

  return (
    <TouchableOpacity onPress={onPress} disabled={uploading} activeOpacity={0.7}>
      <Animated.View
        style={[
          styles.docBtn,
          uploaded && styles.docBtnUploaded,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <View style={styles.docLeft}>
          {uploading ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.docIcon} />
          ) : uploaded ? (
            <Animated.View style={[styles.checkCircle, { opacity: checkOpacity }]}>
              <Ionicons name="checkmark" size={14} color={colors.brandWhite} />
            </Animated.View>
          ) : (
            <View style={styles.uploadCircle}>
              <Ionicons name="camera-outline" size={16} color={colors.textMuted} />
            </View>
          )}
          <Text style={[styles.docLabel, uploaded && styles.docLabelUploaded]}>
            {label}
          </Text>
        </View>
        <Text style={[styles.docAction, uploaded && styles.docActionUploaded]}>
          {uploading ? 'Subiendo…' : uploaded ? 'Subida ✓' : 'Subir foto'}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Pantalla principal ─────────────────────────────────────────────
export default function VehicleDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { reload } = useProfileBootstrap('owner');

  const [selfAssigning, setSelfAssigning] = useState(false);
  const [uploadingFront, setUploadingFront] = useState(false);
  const [uploadingBack, setUploadingBack] = useState(false);
  const [licenseFront, setLicenseFront] = useState('');
  const [licenseBack, setLicenseBack] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const vehicle = getVehicle(id ?? '');
  const vehicleDriver = vehicle
    ? getOwnerDrivers(vehicle.ownerId).find((d) => d.vehicleId === vehicle.vehicleId)
    : null;

  useEffect(() => {
    if (vehicleDriver) {
      setLicenseFront(vehicleDriver.licenseFront ?? '');
      setLicenseBack(vehicleDriver.licenseBack ?? '');
    }
  }, [vehicleDriver?.id, vehicleDriver?.licenseFront, vehicleDriver?.licenseBack]);

  if (!vehicle) return null;

  const approvalHint = getVehicleApprovalHint(vehicle.status);
  const canInvite = canVehicleInviteDrivers(vehicle.status);
  const canOperateVehicle = canVehicleOperate(vehicle.status);
  const driverPending = vehicleDriver?.status === 'pending';
  const driverApproved = vehicleDriver && canDriverOperateVehicle(vehicleDriver.status);
  const canSelfAssign = canOperateVehicle && !vehicleDriver;
  const canReplaceLicense = Boolean(vehicleDriver && !driverApproved);
  const driverHint = vehicleDriver ? getDriverApprovalHint(vehicleDriver.status) : null;

  const bothUploaded = Boolean(licenseFront && licenseBack);

  const uploadLicense = async (side: 'front' | 'back') => {
    setError('');
    const setUploading = side === 'front' ? setUploadingFront : setUploadingBack;
    setUploading(true);
    try {
      const { pickAndUploadDocument } = await import('../../src/services/uploadService');
      const url = await pickAndUploadDocument(
        side === 'front' ? 'licenseFront' : 'licenseBack'
      );
      if (!url) {
        // El usuario canceló el picker — no es error
        setUploading(false);
        return;
      }
      if (side === 'front') setLicenseFront(url);
      else setLicenseBack(url);
    } catch (e) {
      Alert.alert(
        'Error al subir foto',
        'No se pudo subir la imagen. Verifica que la app tiene permiso para acceder a tu galería e intenta de nuevo.',
        [{ text: 'Entendido' }]
      );
      setError('No se pudo subir la imagen. Intenta de nuevo.');
    } finally {
      setUploading(false);
    }
  };

  const submitSelfAssign = async () => {
    if (!licenseFront || !licenseBack) {
      setError('Sube la foto frontal y trasera de tu licencia antes de continuar.');
      return;
    }
    setSelfAssigning(true);
    setError('');
    const res = await selfAssignOwnerAsDriver(vehicle.vehicleId, licenseFront, licenseBack);
    setSelfAssigning(false);
    if (!res.ok) {
      const msg = res.error ?? 'Intenta de nuevo';
      setError(msg);
      showError('No se pudo enviar', msg);
      return;
    }
    if (res.data?.licenseFront) setLicenseFront(res.data.licenseFront);
    if (res.data?.licenseBack) setLicenseBack(res.data.licenseBack);
    setSubmitted(true);
    await reload();
    showSuccess(
      driverApproved ? 'Conductor aprobado' : 'Licencia enviada',
      res.data?.message ??
        'Tu perfil de conductor está pendiente de aprobación por un administrador.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`Unidad #${vehicle.unitNumber}`} />
      <ScrollView contentContainerStyle={styles.content}>
        {/* ── Info del vehículo ── */}
        <Card>
          <VehicleBadge type={vehicle.vehicleType} />
          <Text style={styles.row}>Placa: {vehicle.plateNumber}</Text>
          <Text style={styles.row}>
            Marca/Modelo: {vehicle.brand ?? '—'} {vehicle.model ?? ''}
          </Text>
          <Text style={styles.row}>Asociación: {vehicle.associationName}</Text>
          <StatusBadge status={getVehicleStatusLabel(vehicle.status)} />
          {approvalHint ? <Text style={styles.hint}>{approvalHint}</Text> : null}
          {vehicleDriver ? (
            <>
              <Text style={styles.row}>Conductor: {vehicleDriver.name}</Text>
              <StatusBadge status={getDriverStatusLabel(vehicleDriver.status)} />
              {driverHint ? <Text style={styles.hint}>{driverHint}</Text> : null}
            </>
          ) : null}
        </Card>

        {/* ── Subida de licencia ── */}
        {canOperateVehicle && (canSelfAssign || canReplaceLicense) ? (
          <Card style={styles.licenseCard}>
            <Text style={styles.section}>Licencia de conducir</Text>
            <Text style={styles.instructions}>
              Toma fotos claras de ambos lados de tu licencia. Asegúrate que el texto sea legible.
            </Text>

            <DocRow
              label="Licencia — frontal"
              uploaded={Boolean(licenseFront)}
              uploading={uploadingFront}
              onPress={() => void uploadLicense('front')}
            />
            <DocRow
              label="Licencia — trasera"
              uploaded={Boolean(licenseBack)}
              uploading={uploadingBack}
              onPress={() => void uploadLicense('back')}
            />

            {/* Indicador de progreso */}
            <View style={styles.progressRow}>
              <View style={[styles.progressDot, licenseFront ? styles.progressDotDone : null]} />
              <View
                style={[
                  styles.progressLine,
                  bothUploaded ? styles.progressLineDone : null,
                ]}
              />
              <View style={[styles.progressDot, licenseBack ? styles.progressDotDone : null]} />
            </View>
            <Text style={styles.progressLabel}>
              {!licenseFront && !licenseBack
                ? 'Sube ambas fotos para continuar'
                : !licenseFront
                  ? 'Falta la foto frontal'
                  : !licenseBack
                    ? 'Falta la foto trasera'
                    : '¡Listo! Ya puedes enviar tu licencia'}
            </Text>

            {hasDriverLicenseUploaded({ licenseFront, licenseBack }) && driverPending ? (
              <View style={styles.pendingBanner}>
                <Ionicons name="time-outline" size={16} color={colors.warning} />
                <Text style={styles.pendingBannerText}>
                  Licencia registrada — pendiente de aprobación por el equipo MOVI.
                </Text>
              </View>
            ) : null}

            {submitted ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success ?? '#22c55e'} />
                <Text style={styles.successBannerText}>
                  Licencia enviada correctamente. Te notificaremos cuando sea aprobada.
                </Text>
              </View>
            ) : null}

            {error ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <PrimaryButton
              title={
                vehicleDriver
                  ? 'Actualizar licencia / reenviar'
                  : 'Enviar licencia y operar vehículo'
              }
              onPress={() => void submitSelfAssign()}
              loading={selfAssigning}
              disabled={!bothUploaded || selfAssigning}
              style={{ marginTop: spacing.sm, opacity: bothUploaded ? 1 : 0.45 }}
            />
            {!bothUploaded && (
              <Text style={styles.disabledHint}>
                El botón se activa cuando subas ambas fotos
              </Text>
            )}
          </Card>
        ) : null}

        {driverApproved ? (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success ?? '#22c55e'} />
            <Text style={styles.successBannerText}>
              Ya puedes operar esta unidad como conductor.
            </Text>
          </View>
        ) : null}

        <PrimaryButton
          title="Invitar conductor"
          onPress={() =>
            router.push({
              pathname: '/owner/invite-driver',
              params: { id: vehicle.vehicleId },
            })
          }
          disabled={!canInvite || !!vehicleDriver}
          variant="outline"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxl },
  row: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  hint: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },
  section: { ...typography.subtitle, color: colors.text, marginBottom: spacing.xs },
  instructions: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm, lineHeight: 18 },
  licenseCard: { gap: spacing.sm },

  // Doc rows
  docBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.borderLight,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  docBtnUploaded: {
    backgroundColor: '#22c55e12',
    borderColor: '#22c55e40',
  },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  docIcon: { width: 28 },
  uploadCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#22c55e',
    alignItems: 'center', justifyContent: 'center',
  },
  docLabel: { ...typography.body, color: colors.text },
  docLabelUploaded: { color: '#15803d', fontWeight: '600' },
  docAction: { ...typography.caption, color: colors.textMuted },
  docActionUploaded: { color: '#22c55e', fontWeight: '600' },

  // Progress
  progressRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing.sm, marginBottom: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  progressDot: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: colors.borderLight,
    borderWidth: 2, borderColor: colors.textMuted,
  },
  progressDotDone: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  progressLine: { flex: 1, height: 3, backgroundColor: colors.borderLight, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: '#22c55e' },
  progressLabel: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },

  // Banners
  pendingBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.warning + '15',
    borderRadius: radius.md, padding: spacing.md,
  },
  pendingBannerText: { ...typography.caption, color: colors.warning, flex: 1, lineHeight: 16 },
  successBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: '#22c55e15',
    borderRadius: radius.md, padding: spacing.md,
  },
  successBannerText: { ...typography.caption, color: '#15803d', flex: 1, lineHeight: 16 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    backgroundColor: colors.danger + '12',
    borderRadius: radius.md, padding: spacing.md,
  },
  errorText: { ...typography.caption, color: colors.danger, flex: 1, lineHeight: 16 },
  disabledHint: {
    ...typography.caption, color: colors.textMuted,
    textAlign: 'center', marginTop: spacing.xs,
  },
});
