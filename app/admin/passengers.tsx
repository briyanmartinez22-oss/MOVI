import { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { AdminEntityCard, type EntityAction } from '../../src/components/admin/AdminEntityCard';
import { FormInput } from '../../src/components/FormUI';
import { PrimaryButton } from '../../src/components';
import {
  deleteAdminPassenger,
  fetchAdminPassengerDetail,
  fetchAdminPassengers,
  reactivateAdminPassenger,
  suspendAdminPassenger,
  updateAdminPassenger,
} from '../../src/services/api';
import { useAdminEntityActions } from '../../src/hooks/useAdminEntityActions';
import type {
  AdminPassengerDetail,
  AdminPassengerRecord,
} from '../../src/types/adminUsers';
import { colors, typography, spacing, radius } from '../../src/theme';

function passengerActions(p: AdminPassengerRecord): EntityAction[] {
  const actions: EntityAction[] = ['view', 'edit'];
  if (p.mvpStatus === 'SUSPENDED' || p.accountStatus === 'suspended') {
    actions.push('reactivate');
  } else {
    actions.push('suspend');
  }
  actions.push('delete');
  return actions;
}

export default function AdminPassengersScreen() {
  const router = useRouter();
  const [passengers, setPassengers] = useState<AdminPassengerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<AdminPassengerDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editTarget, setEditTarget] = useState<AdminPassengerRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDui, setEditDui] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setPassengers(await fetchAdminPassengers());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runEntityAction = useCallback(
    async (action: EntityAction, id: string) => {
      if (action === 'suspend') return suspendAdminPassenger(id);
      if (action === 'reactivate') return reactivateAdminPassenger(id);
      if (action === 'delete') return deleteAdminPassenger(id);
      return { ok: false, error: 'Acción no soportada' };
    },
    []
  );

  const { requestAction, confirmModal } = useAdminEntityActions(runEntityAction, load);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    const data = await fetchAdminPassengerDetail(id);
    setDetailLoading(false);
    if (!data) {
      Alert.alert('Error', 'No se pudo cargar el detalle');
      return;
    }
    setDetail(data);
  };

  const openEdit = (p: AdminPassengerRecord) => {
    setEditTarget(p);
    setEditName(p.fullName);
    setEditPhone(p.phoneNumber);
    setEditDui(p.duiNumber ?? '');
  };

  const saveEdit = async () => {
    if (!editTarget) return;
    setEditSaving(true);
    const res = await updateAdminPassenger(editTarget.id, {
      fullName: editName,
      phoneNumber: editPhone,
      duiNumber: editDui || null,
    });
    setEditSaving(false);
    if (!res.ok) {
      Alert.alert('Error', res.error ?? 'No se pudo guardar');
      return;
    }
    setEditTarget(null);
    await load();
    Alert.alert('Guardado', 'Pasajero actualizado');
  };

  const handleAction = (p: AdminPassengerRecord, action: EntityAction) => {
    if (action === 'view') void openDetail(p.id);
    else if (action === 'edit') openEdit(p);
    else requestAction(action, p.id);
  };

  return (
    <>
      <AdminModulePage
        title="Passengers"
        subtitle="Directorio de pasajeros · acciones con auditoría"
        loading={loading}
        empty={!loading && passengers.length === 0 ? 'Sin pasajeros registrados' : undefined}
        onBack={() => router.replace('/admin')}
      >
        {passengers.map((p) => (
          <AdminEntityCard
            key={p.id}
            title={p.fullName}
            mvpStatus={p.mvpStatus ?? 'VERIFIED'}
            lines={[
              p.phoneNumber,
              p.duiNumber ? `DUI: ${p.duiNumber}` : 'Sin DUI',
              `Viajes: ${p.totalTrips} · Completados: ${p.completedTrips}`,
              `Registro: ${new Date(p.createdAt).toLocaleDateString('es-SV')}`,
            ]}
            actions={passengerActions(p)}
            onAction={(action) => handleAction(p, action)}
          />
        ))}
      </AdminModulePage>

      {confirmModal}

      <Modal visible={detailLoading || detail != null} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            {detailLoading ? (
              <ActivityIndicator color={colors.brandRed} />
            ) : detail ? (
              <ScrollView>
                <Text style={styles.modalTitle}>{detail.fullName}</Text>
                <Text style={styles.line}>Tel: {detail.phoneNumber}</Text>
                <Text style={styles.line}>DUI: {detail.duiNumber ?? '—'}</Text>
                <Text style={styles.line}>Estado: {detail.mvpStatus ?? detail.accountStatus}</Text>
                <Text style={styles.line}>
                  Viajes: {detail.totalTrips} · Completados: {detail.completedTrips}
                </Text>
                <Text style={styles.section}>Últimos viajes</Text>
                {(detail.recentTrips ?? []).length === 0 ? (
                  <Text style={styles.muted}>Sin viajes</Text>
                ) : (
                  detail.recentTrips!.map((t) => (
                    <Text key={t.id} style={styles.line}>
                      {t.status} · {new Date(t.createdAt).toLocaleString('es-SV')}
                    </Text>
                  ))
                )}
                <PrimaryButton title="Cerrar" variant="outline" onPress={() => setDetail(null)} />
              </ScrollView>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={editTarget != null} transparent animationType="slide">
        <Pressable style={styles.backdrop} onPress={() => !editSaving && setEditTarget(null)}>
          <Pressable style={styles.panel} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Editar pasajero</Text>
            <FormInput label="Nombre" value={editName} onChangeText={setEditName} />
            <FormInput label="Teléfono" value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
            <FormInput label="DUI" value={editDui} onChangeText={setEditDui} />
            <PrimaryButton title="Guardar" onPress={() => void saveEdit()} disabled={editSaving} />
            <PrimaryButton
              title="Cancelar"
              variant="outline"
              onPress={() => setEditTarget(null)}
              style={styles.cancelBtn}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalTitle: { ...typography.subtitle, color: colors.text, marginBottom: spacing.md },
  line: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  section: { ...typography.bodyMedium, color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  muted: { ...typography.caption, color: colors.textMuted },
  cancelBtn: { marginTop: spacing.sm },
});
