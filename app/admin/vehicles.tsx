import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { AdminEntityCard, type EntityAction } from '../../src/components/admin/AdminEntityCard';
import {
  approveVehicle,
  deleteVehicle,
  fetchAdminVehicles,
  reactivateVehicle,
  rejectVehicle,
  suspendVehicle,
} from '../../src/services/api';
import { useAdminEntityActions } from '../../src/hooks/useAdminEntityActions';
import type { AdminVehicleRecord } from '../../src/types/adminUsers';

function vehicleActions(v: AdminVehicleRecord): EntityAction[] {
  const actions: EntityAction[] = ['view'];
  const pending =
    v.mvpStatus === 'PENDING_REVIEW' ||
    v.mvpStatus === 'PENDING_DOCUMENTS' ||
    v.status === 'incomplete' ||
    v.status === 'under_review';
  if (pending) {
    actions.push('approve', 'reject');
  }
  if (v.mvpStatus === 'SUSPENDED' || v.mvpStatus === 'REJECTED') {
    actions.push('reactivate');
  } else if (v.mvpStatus === 'VERIFIED') {
    actions.push('suspend');
  } else if (pending) {
    actions.push('suspend');
  }
  actions.push('delete');
  return actions;
}

export default function AdminVehiclesScreen() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<AdminVehicleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setVehicles(await fetchAdminVehicles());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runEntityAction = useCallback(async (action: EntityAction, id: string) => {
    if (action === 'view') {
      router.push(`/admin/vehicles/${id}` as never);
      return { ok: true };
    }
    if (action === 'approve') return approveVehicle(id);
    if (action === 'reject') return rejectVehicle(id);
    if (action === 'suspend') return suspendVehicle(id);
    if (action === 'reactivate') return reactivateVehicle(id);
    if (action === 'delete') return deleteVehicle(id);
    return { ok: false, error: 'Acción no soportada' };
  }, [router]);

  const { requestAction, confirmModal } = useAdminEntityActions(runEntityAction, load);

  return (
    <>
      <AdminModulePage
        title="Vehículos"
        subtitle="Unidades registradas · revisión, aprobación y suspensión"
        loading={loading}
        empty={!loading && vehicles.length === 0 ? 'Sin vehículos registrados' : undefined}
        onBack={() => router.replace('/admin')}
      >
        {vehicles.map((v) => (
          <AdminEntityCard
            key={v.id}
            title={`#${v.unitNumber} · ${v.plateNumber}`}
            mvpStatus={v.mvpStatus}
            lines={[
              `${v.brand ?? '—'} ${v.model ?? ''} ${v.year ?? ''}`.trim(),
              `Tipo: ${v.vehicleType} · Asoc: ${v.associationName}`,
              v.owner ? `Dueño: ${v.owner.name} · ${v.owner.phone}` : 'Sin dueño',
              v.driver ? `Conductor: ${v.driver.name}` : 'Sin conductor asignado',
              v.rejectReason ? `Motivo: ${v.rejectReason}` : `Registro: ${new Date(v.createdAt).toLocaleDateString()}`,
            ]}
            actions={vehicleActions(v)}
            onAction={(action) => {
              if (action === 'view') {
                void runEntityAction('view', v.id);
                return;
              }
              requestAction(action, v.id);
            }}
          />
        ))}
      </AdminModulePage>
      {confirmModal}
    </>
  );
}
