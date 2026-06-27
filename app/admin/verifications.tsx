import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Image,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '../../src/components';
import { Card, ScreenHeader, StatusBadge } from '../../src/components/FormUI';
import {
  approveDriver,
  approveOwner,
  approveVehicle,
  fetchPendingVerifications,
  rejectDriver,
  rejectOwner,
  rejectVehicle,
  suspendDriver,
  suspendOwner,
  suspendVehicle,
} from '../../src/services/api';
import { useAuth } from '../../src/context/AuthContext';
import { MVP_STATUS_LABELS, type MvpVerificationStatus } from '../../src/utils/verificationStatus';
import { colors, typography, spacing, radius } from '../../src/theme';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type VerificationOwner = {
  id: string;
  name: string;
  phone?: string;
  dui: string;
  mvpStatus: MvpVerificationStatus;
  duiFront?: string;
  duiBack?: string;
  licenseFront?: string;
  licenseBack?: string;
  profilePhoto?: string;
  nitUrl?: string;
};

type VerificationVehicle = {
  vehicleId: string;
  unitNumber: string;
  plateNumber: string;
  vehicleType?: string;
  brand?: string;
  model?: string;
  mvpStatus: MvpVerificationStatus;
  vehiclePhoto?: string;
  circulationCard?: string;
  insuranceDoc?: string;
};

type VerificationDriver = {
  id: string;
  name: string;
  phone?: string;
  unitNumber?: string;
  plateNumber?: string;
  mvpStatus: MvpVerificationStatus;
  licenseFront?: string;
  licenseBack?: string;
  profilePhoto?: string;
};

type PendingVerifications = {
  owners: VerificationOwner[];
  vehicles: VerificationVehicle[];
  drivers: VerificationDriver[];
};

type EntityType = 'owner' | 'vehicle' | 'driver';
type AdminAction = 'approve' | 'reject' | 'suspend';

type ReviewTarget = {
  type: EntityType;
  id: string;
  name: string;
  mvpStatus: MvpVerificationStatus;
  docs: { label: string; url: string }[];
  meta: { label: string; value: string }[];
};

// ── Visor de foto en pantalla completa ─────────────────────────────
function PhotoViewer({
  uri,
  label,
  onClose,
}: {
  uri: string;
  label: string;
  onClose: () => void;
}) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={photoStyles.overlay}>
        <TouchableOpacity style={photoStyles.closeBtn} onPress={onClose}>
          <Ionicons name="close-circle" size={36} color="#fff" />
        </TouchableOpacity>
        <Text style={photoStyles.label}>{label}</Text>
        <Image
          source={{ uri }}
          style={photoStyles.image}
          resizeMode="contain"
        />
      </View>
    </Modal>
  );
}

const photoStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: { position: 'absolute', top: 56, right: 20, zIndex: 10 },
  label: { color: '#fff', fontSize: 14, marginBottom: 16, opacity: 0.8 },
  image: { width: SCREEN_W - 32, height: SCREEN_H * 0.72, borderRadius: 8 },
});

// ── Modal de revisión ───────────────────────────────────────────────
function ReviewModal({
  target,
  onClose,
  onAction,
}: {
  target: ReviewTarget;
  onClose: () => void;
  onAction: (action: AdminAction, id: string, type: EntityType, reason?: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ uri: string; label: string } | null>(null);

  const handle = async (action: AdminAction) => {
    if (action === 'reject' && !reason.trim()) {
      Alert.alert('Motivo requerido', 'Escribe el motivo del rechazo para notificar al usuario.');
      return;
    }
    setActing(true);
    await onAction(action, target.id, target.type, reason.trim() || undefined);
    setActing(false);
    onClose();
  };

  const isPending =
    target.mvpStatus === 'PENDING_APPROVAL' || target.mvpStatus === 'PENDING_REVIEW';

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      {photoViewer ? (
        <PhotoViewer
          uri={photoViewer.uri}
          label={photoViewer.label}
          onClose={() => setPhotoViewer(null)}
        />
      ) : (
        <View style={modalStyles.overlay}>
          <View style={modalStyles.sheet}>
            <View style={modalStyles.handle} />

            {/* Header */}
            <View style={modalStyles.header}>
              <View>
                <Text style={modalStyles.title}>{target.name}</Text>
                <StatusBadge status={MVP_STATUS_LABELS[target.mvpStatus] ?? target.mvpStatus} />
              </View>
              <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={modalStyles.body} showsVerticalScrollIndicator={false}>
              {/* Datos registrados */}
              {target.meta.length > 0 && (
                <View style={modalStyles.section}>
                  <Text style={modalStyles.sectionTitle}>Datos registrados</Text>
                  {target.meta.map((m) => (
                    <View key={m.label} style={modalStyles.metaRow}>
                      <Text style={modalStyles.metaLabel}>{m.label}</Text>
                      <Text style={modalStyles.metaValue}>{m.value}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Documentos con fotos */}
              {target.docs.length > 0 && (
                <View style={modalStyles.section}>
                  <Text style={modalStyles.sectionTitle}>Documentos</Text>
                  {target.docs.map((doc) => (
                    <TouchableOpacity
                      key={doc.label}
                      style={modalStyles.docRow}
                      onPress={() => setPhotoViewer({ uri: doc.url, label: doc.label })}
                      activeOpacity={0.75}
                    >
                      <View style={modalStyles.docLeft}>
                        <View style={modalStyles.docThumb}>
                          <Image
                            source={{ uri: doc.url }}
                            style={modalStyles.thumbImage}
                            resizeMode="cover"
                          />
                        </View>
                        <Text style={modalStyles.docLabel}>{doc.label}</Text>
                      </View>
                      <View style={modalStyles.viewBtn}>
                        <Ionicons name="expand-outline" size={16} color={colors.primary} />
                        <Text style={modalStyles.viewBtnText}>Ver</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {target.docs.length === 0 && (
                <View style={modalStyles.noDocs}>
                  <Ionicons name="document-outline" size={32} color={colors.textMuted} />
                  <Text style={modalStyles.noDocsText}>Sin documentos subidos aún</Text>
                </View>
              )}

              {/* Motivo de rechazo */}
              {isPending && (
                <View style={modalStyles.section}>
                  <Text style={modalStyles.sectionTitle}>
                    Motivo de rechazo{' '}
                    <Text style={{ color: colors.danger }}>*</Text>
                    <Text style={{ color: colors.textMuted, fontWeight: '400' }}>
                      {' '}(requerido si rechazas)
                    </Text>
                  </Text>
                  <TextInput
                    style={modalStyles.reasonInput}
                    placeholder="Ej: Foto de licencia borrosa, DUI vencido…"
                    placeholderTextColor={colors.textMuted}
                    value={reason}
                    onChangeText={setReason}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              )}
            </ScrollView>

            {/* Botones de acción */}
            {isPending && (
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  style={[modalStyles.actionBtn, modalStyles.rejectBtn]}
                  onPress={() => void handle('reject')}
                  disabled={acting}
                >
                  <Ionicons name="close-circle-outline" size={18} color={colors.danger} />
                  <Text style={[modalStyles.actionBtnText, { color: colors.danger }]}>
                    Rechazar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.actionBtn, modalStyles.approveBtn]}
                  onPress={() => void handle('approve')}
                  disabled={acting}
                >
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={[modalStyles.actionBtnText, { color: '#fff' }]}>
                    {acting ? 'Procesando…' : 'Aprobar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {!isPending && target.mvpStatus !== 'SUSPENDED' && (
              <View style={modalStyles.footer}>
                <TouchableOpacity
                  style={[modalStyles.actionBtn, modalStyles.rejectBtn]}
                  onPress={() => void handle('suspend')}
                  disabled={acting}
                >
                  <Ionicons name="pause-circle-outline" size={18} color={colors.danger} />
                  <Text style={[modalStyles.actionBtnText, { color: colors.danger }]}>
                    Suspender
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface ?? colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.92,
    paddingBottom: 32,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.borderLight,
  },
  title: { ...typography.subtitle, color: colors.text, marginBottom: 4 },
  closeBtn: { padding: 4 },
  body: { padding: spacing.lg, gap: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.caption, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  metaLabel: { ...typography.caption, color: colors.textSecondary },
  metaValue: { ...typography.bodyMedium, color: colors.text },
  docRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.borderLight, borderRadius: radius.md, padding: spacing.sm,
  },
  docLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  docThumb: { width: 52, height: 40, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surface },
  thumbImage: { width: 52, height: 40 },
  docLabel: { ...typography.body, color: colors.text, flex: 1 },
  viewBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm },
  viewBtnText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  noDocs: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  noDocsText: { ...typography.caption, color: colors.textMuted },
  reasonInput: {
    backgroundColor: colors.borderLight, borderRadius: radius.md,
    padding: spacing.md, ...typography.body, color: colors.text,
    minHeight: 80, textAlignVertical: 'top',
  },
  footer: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.borderLight,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.md,
  },
  rejectBtn: { backgroundColor: colors.danger + '15', borderWidth: 1, borderColor: colors.danger + '40' },
  approveBtn: { backgroundColor: '#01696f' },
  actionBtnText: { ...typography.bodyMedium, fontWeight: '700' },
});

// ── Pantalla principal ──────────────────────────────────────────────
export default function AdminVerifications() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [pending, setPending] = useState<PendingVerifications>({
    owners: [],
    vehicles: [],
    drivers: [],
  });
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);

  const loadPending = useCallback(async () => {
    const data = await fetchPendingVerifications();
    if (data && typeof data === 'object') {
      const record = data as Partial<PendingVerifications>;
      setPending({
        owners: (record.owners ?? []) as VerificationOwner[],
        vehicles: (record.vehicles ?? []) as VerificationVehicle[],
        drivers: (record.drivers ?? []) as VerificationDriver[],
      });
    }
  }, []);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  const openReview = (target: ReviewTarget) => setReviewTarget(target);

  const runAction = async (
    action: AdminAction,
    id: string,
    type: EntityType,
    reason?: string
  ) => {
    const handlers = {
      owner: { approve: approveOwner, reject: rejectOwner, suspend: suspendOwner },
      vehicle: { approve: approveVehicle, reject: rejectVehicle, suspend: suspendVehicle },
      driver: { approve: approveDriver, reject: rejectDriver, suspend: suspendDriver },
    } as const;

    const res = await handlers[type][action](id, reason);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo completar la acción');
      return;
    }
    refresh();
    await loadPending();
    Alert.alert(
      action === 'approve' ? '✅ Aprobado' : action === 'reject' ? '❌ Rechazado' : '⏸ Suspendido',
      action === 'reject' && reason
        ? `El usuario fue notificado: "${reason}"`
        : 'Estado actualizado en el sistema.'
    );
  };

  const buildDriverTarget = (d: VerificationDriver): ReviewTarget => ({
    type: 'driver',
    id: d.id,
    name: d.name,
    mvpStatus: d.mvpStatus,
    meta: [
      { label: 'Teléfono', value: d.phone ?? '—' },
      { label: 'Vehículo', value: d.unitNumber ? `Unidad #${d.unitNumber} · ${d.plateNumber}` : '—' },
    ],
    docs: [
      d.licenseFront ? { label: 'Licencia frontal', url: d.licenseFront } : null,
      d.licenseBack ? { label: 'Licencia trasera', url: d.licenseBack } : null,
      d.profilePhoto ? { label: 'Foto de perfil', url: d.profilePhoto } : null,
    ].filter(Boolean) as { label: string; url: string }[],
  });

  const buildOwnerTarget = (o: VerificationOwner): ReviewTarget => ({
    type: 'owner',
    id: o.id,
    name: o.name,
    mvpStatus: o.mvpStatus,
    meta: [
      { label: 'DUI', value: o.dui },
      { label: 'Teléfono', value: (o as { phone?: string }).phone ?? '—' },
    ],
    docs: [
      o.duiFront ? { label: 'DUI frontal', url: o.duiFront } : null,
      o.duiBack ? { label: 'DUI trasero', url: o.duiBack } : null,
      (o as { licenseFront?: string }).licenseFront
        ? { label: 'Licencia frontal', url: (o as { licenseFront?: string }).licenseFront! }
        : null,
      (o as { licenseBack?: string }).licenseBack
        ? { label: 'Licencia trasera', url: (o as { licenseBack?: string }).licenseBack! }
        : null,
      o.profilePhoto ? { label: 'Foto de perfil', url: o.profilePhoto } : null,
      o.nitUrl ? { label: 'NIT', url: o.nitUrl } : null,
    ].filter(Boolean) as { label: string; url: string }[],
  });

  const buildVehicleTarget = (v: VerificationVehicle): ReviewTarget => ({
    type: 'vehicle',
    id: v.vehicleId,
    name: `Unidad #${v.unitNumber} · ${v.plateNumber}`,
    mvpStatus: v.mvpStatus,
    meta: [
      { label: 'Tipo', value: v.vehicleType ?? '—' },
      { label: 'Marca/Modelo', value: `${v.brand ?? '—'} ${v.model ?? ''}`.trim() },
      { label: 'Placa', value: v.plateNumber },
    ],
    docs: [
      v.vehiclePhoto ? { label: 'Foto del vehículo', url: v.vehiclePhoto } : null,
      v.circulationCard ? { label: 'Tarjeta de circulación', url: v.circulationCard } : null,
      v.insuranceDoc ? { label: 'Seguro vigente', url: v.insuranceDoc } : null,
    ].filter(Boolean) as { label: string; url: string }[],
  });

  const { owners: pendingOwners, vehicles: pendingVehicles, drivers: pendingDrivers } = pending;
  const totalPending = pendingOwners.length + pendingVehicles.length + pendingDrivers.length;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={`Verificaciones${totalPending > 0 ? ` (${totalPending})` : ''}`}
        onBack={() => router.replace('/admin')}
      />
      <ScrollView contentContainerStyle={styles.content}>

        {/* Conductores */}
        <Text style={styles.section}>
          Conductores ({pendingDrivers.length})
        </Text>
        {pendingDrivers.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.empty}>Sin conductores pendientes</Text>
          </View>
        ) : (
          pendingDrivers.map((d) => (
            <TouchableOpacity
              key={d.id}
              onPress={() => openReview(buildDriverTarget(d))}
              activeOpacity={0.8}
            >
              <Card style={styles.item}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View style={styles.avatarCircle}>
                      <Ionicons name="person" size={18} color={colors.primary} />
                    </View>
                    <View>
                      <Text style={styles.name}>{d.name}</Text>
                      {d.unitNumber ? (
                        <Text style={styles.meta}>Unidad #{d.unitNumber} · {d.plateNumber}</Text>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <View style={styles.itemFooter}>
                  <StatusBadge status={MVP_STATUS_LABELS[d.mvpStatus] ?? d.mvpStatus} />
                  <View style={styles.docsIndicator}>
                    <Ionicons
                      name={d.licenseFront && d.licenseBack ? 'document-text' : 'document-outline'}
                      size={14}
                      color={d.licenseFront && d.licenseBack ? '#22c55e' : colors.textMuted}
                    />
                    <Text style={[
                      styles.docsLabel,
                      { color: d.licenseFront && d.licenseBack ? '#22c55e' : colors.textMuted }
                    ]}>
                      {d.licenseFront && d.licenseBack ? 'Docs subidos' : 'Sin docs'}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Dueños */}
        <Text style={styles.section}>
          Dueños ({pendingOwners.length})
        </Text>
        {pendingOwners.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.empty}>Sin dueños pendientes</Text>
          </View>
        ) : (
          pendingOwners.map((o) => (
            <TouchableOpacity
              key={o.id}
              onPress={() => openReview(buildOwnerTarget(o))}
              activeOpacity={0.8}
            >
              <Card style={styles.item}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View style={styles.avatarCircle}>
                      <Ionicons name="business" size={18} color="#964219" />
                    </View>
                    <View>
                      <Text style={styles.name}>{o.name}</Text>
                      <Text style={styles.meta}>DUI: {o.dui}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <StatusBadge status={MVP_STATUS_LABELS[o.mvpStatus] ?? o.mvpStatus} />
              </Card>
            </TouchableOpacity>
          ))
        )}

        {/* Vehículos */}
        <Text style={styles.section}>
          Vehículos ({pendingVehicles.length})
        </Text>
        {pendingVehicles.length === 0 ? (
          <View style={styles.emptyRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.textMuted} />
            <Text style={styles.empty}>Sin vehículos pendientes</Text>
          </View>
        ) : (
          pendingVehicles.map((v) => (
            <TouchableOpacity
              key={v.vehicleId}
              onPress={() => openReview(buildVehicleTarget(v))}
              activeOpacity={0.8}
            >
              <Card style={styles.item}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemLeft}>
                    <View style={styles.avatarCircle}>
                      <Ionicons name="car-sport" size={18} color="#006494" />
                    </View>
                    <View>
                      <Text style={styles.name}>Unidad #{v.unitNumber} · {v.plateNumber}</Text>
                      {v.brand ? <Text style={styles.meta}>{v.brand} {v.model}</Text> : null}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
                <StatusBadge status={MVP_STATUS_LABELS[v.mvpStatus] ?? v.mvpStatus} />
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {reviewTarget && (
        <ReviewModal
          target={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onAction={runAction}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: 40 },
  section: {
    ...typography.subtitle, color: colors.text,
    marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  item: { marginBottom: spacing.sm },
  itemHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.borderLight,
    alignItems: 'center', justifyContent: 'center',
  },
  itemFooter: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginTop: spacing.xs,
  },
  docsIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  docsLabel: { ...typography.caption },
  name: { ...typography.bodyMedium, color: colors.text },
  meta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  emptyRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, marginBottom: spacing.sm,
  },
  empty: { ...typography.caption, color: colors.textMuted },
});
