import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PrimaryButton } from '../../../src/components';
import { Card, FormInput, ScreenHeader, StatusBadge } from '../../../src/components/FormUI';
import {
  approveVehicle,
  deleteVehicle,
  fetchAdminVehicleDetail,
  reactivateVehicle,
  rejectVehicle,
  suspendVehicle,
} from '../../../src/services/api';
import { useAdminMe } from '../../../src/hooks/useAdminMe';
import type { AdminVehicleRecord } from '../../../src/types/adminUsers';
import { MVP_STATUS_LABELS } from '../../../src/utils/verificationStatus';
import { colors, spacing, typography } from '../../../src/theme';

export default function AdminVehicleDetailScreen() {
  const router = useRouter();
  const { vehicleId } = useLocalSearchParams<{ vehicleId: string }>();
  const { actor } = useAdminMe();
  const [vehicle, setVehicle] = useState<AdminVehicleRecord | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!vehicleId) return;
    setLoading(true);
    setVehicle(await fetchAdminVehicleDetail(vehicleId));
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setError('');
    setActionLoading(true);
    const res = await fn();
    setActionLoading(false);
    if (!res.ok) {
      setError(res.error ?? 'Error');
      return;
    }
    await load();
  };

  const isSuperAdmin = actor?.staffRole === 'SUPER_ADMIN';
  const canModerate =
    vehicle &&
    (vehicle.mvpStatus === 'PENDING_REVIEW' ||
      vehicle.mvpStatus === 'PENDING_DOCUMENTS' ||
      vehicle.status === 'incomplete');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Vehículo" onBack={() => router.back()} />
        <Text style={styles.loading}>Cargando…</Text>
      </SafeAreaView>
    );
  }

  if (!vehicle) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Vehículo" onBack={() => router.back()} />
        <Text style={styles.loading}>Vehículo no encontrado</Text>
      </SafeAreaView>
    );
  }

  const docEntries = Object.entries(vehicle.documents ?? {}).filter(
    (entry): entry is [string, string] => Boolean(entry[1])
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={`Unidad #${vehicle.unitNumber}`} onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{vehicle.plateNumber}</Text>
          <StatusBadge status={MVP_STATUS_LABELS[vehicle.mvpStatus as keyof typeof MVP_STATUS_LABELS] ?? vehicle.mvpStatus} />
        </View>

        <Card style={styles.card}>
          <Text style={styles.label}>Datos</Text>
          <Text style={styles.line}>Tipo: {vehicle.vehicleType}</Text>
          <Text style={styles.line}>
            Marca/modelo: {[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(' ') || '—'}
          </Text>
          <Text style={styles.line}>Color: {vehicle.color ?? '—'}</Text>
          <Text style={styles.line}>Asociación: {vehicle.associationName}</Text>
          <Text style={styles.line}>Tarjeta a nombre de: {vehicle.registrationName ?? '—'}</Text>
          <Text style={styles.line}>Estado BD: {vehicle.status}</Text>
          {vehicle.rejectReason ? (
            <Text style={styles.reject}>Motivo: {vehicle.rejectReason}</Text>
          ) : null}
          <Text style={styles.line}>Registro: {new Date(vehicle.createdAt).toLocaleString()}</Text>
        </Card>

        {vehicle.owner ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Dueño</Text>
            <Text style={styles.line}>{vehicle.owner.name}</Text>
            <Text style={styles.line}>{vehicle.owner.phone}</Text>
            <Text style={styles.line}>DUI: {vehicle.owner.dui}</Text>
          </Card>
        ) : null}

        {vehicle.driver ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Conductor</Text>
            <Text style={styles.line}>{vehicle.driver.name}</Text>
            <Text style={styles.line}>{vehicle.driver.phone}</Text>
            <Text style={styles.line}>Estado: {vehicle.driver.status}</Text>
          </Card>
        ) : null}

        <Card style={styles.card}>
          <Text style={styles.label}>Documentos / fotos</Text>
          {docEntries.length === 0 ? (
            <Text style={styles.line}>Sin documentos cargados</Text>
          ) : (
            docEntries.map(([key, url]) => (
              <View key={key} style={styles.docRow}>
                <Text style={styles.line}>{key}</Text>
                {url.startsWith('http') ? (
                  <>
                    <Image source={{ uri: url }} style={styles.thumb} />
                    <PrimaryButton
                      title="Abrir"
                      variant="outline"
                      onPress={() => void Linking.openURL(url)}
                    />
                  </>
                ) : (
                  <Text style={styles.line}>{url}</Text>
                )}
              </View>
            ))
          )}
        </Card>

        {canModerate ? (
          <Card style={styles.card}>
            <Text style={styles.label}>Acciones de revisión</Text>
            <FormInput
              label="Motivo de rechazo (opcional)"
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Describe el motivo si vas a rechazar"
            />
            <View style={styles.actions}>
              <PrimaryButton
                title="Aprobar"
                loading={actionLoading}
                onPress={() => void run(() => approveVehicle(vehicle.id))}
              />
              <PrimaryButton
                title="Rechazar"
                variant="outline"
                loading={actionLoading}
                onPress={() => void run(() => rejectVehicle(vehicle.id, rejectReason.trim() || undefined))}
              />
              <PrimaryButton
                title="Suspender"
                variant="outline"
                loading={actionLoading}
                onPress={() => void run(() => suspendVehicle(vehicle.id))}
              />
            </View>
          </Card>
        ) : null}

        {(vehicle.mvpStatus === 'SUSPENDED' || vehicle.mvpStatus === 'REJECTED') && (
          <PrimaryButton
            title="Reactivar"
            loading={actionLoading}
            onPress={() => void run(() => reactivateVehicle(vehicle.id))}
          />
        )}

        {isSuperAdmin ? (
          <PrimaryButton
            title="Eliminar vehículo"
            variant="outline"
            loading={actionLoading}
            onPress={() =>
              void run(async () => {
                const res = await deleteVehicle(vehicle.id);
                if (res.ok) router.replace('/admin/vehicles');
                return res;
              })
            }
          />
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  loading: { padding: spacing.lg, ...typography.body, color: colors.textSecondary },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...typography.title, color: colors.text },
  card: { gap: spacing.xs },
  label: { ...typography.subtitle, color: colors.text, marginBottom: spacing.xs },
  line: { ...typography.body, color: colors.textSecondary },
  reject: { ...typography.body, color: colors.danger, marginTop: spacing.xs },
  docRow: { marginBottom: spacing.md, gap: spacing.xs },
  thumb: { width: '100%', height: 160, borderRadius: 8, backgroundColor: colors.border },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  error: { ...typography.caption, color: colors.danger },
});
