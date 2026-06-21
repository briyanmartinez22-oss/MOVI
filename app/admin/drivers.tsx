import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { AdminEntityCard, type EntityAction } from '../../src/components/admin/AdminEntityCard';
import {
  approveDriver,
  deleteDriver,
  fetchAdminDrivers,
  reactivateDriver,
  rejectDriver,
  suspendDriver,
} from '../../src/services/api';
import { useAdminEntityActions } from '../../src/hooks/useAdminEntityActions';
import type { AdminDriverRecord } from '../../src/types/adminUsers';

function driverActions(d: AdminDriverRecord): EntityAction[] {
  const actions: EntityAction[] = [];
  if (d.mvpStatus !== 'VERIFIED' && d.mvpStatus !== 'SUSPENDED') {
    actions.push('approve', 'reject');
  }
  if (d.mvpStatus === 'SUSPENDED') {
    actions.push('reactivate');
  } else {
    actions.push('suspend');
  }
  actions.push('delete');
  return actions;
}

export default function AdminDriversScreen() {
  const router = useRouter();
  const [drivers, setDrivers] = useState<AdminDriverRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setDrivers(await fetchAdminDrivers());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runEntityAction = useCallback(async (action: EntityAction, id: string) => {
    if (action === 'approve') return approveDriver(id);
    if (action === 'reject') return rejectDriver(id);
    if (action === 'suspend') return suspendDriver(id);
    if (action === 'reactivate') return reactivateDriver(id);
    if (action === 'delete') return deleteDriver(id);
    return { ok: false, error: 'Acción no soportada' };
  }, []);

  const { requestAction, confirmModal } = useAdminEntityActions(runEntityAction, load);

  return (
    <>
      <AdminModulePage
        title="Drivers"
        subtitle="Conductores · aprobación, suspensión y auditoría"
        loading={loading}
        empty={!loading && drivers.length === 0 ? 'Sin conductores registrados' : undefined}
        onBack={() => router.replace('/admin')}
      >
        {drivers.map((d) => (
          <AdminEntityCard
            key={d.id}
            title={`${d.name}${d.online ? ' · Online' : ''}`}
            mvpStatus={d.mvpStatus}
            lines={[
              d.phone,
              d.vehicle
                ? `Unidad #${d.vehicle.unitNumber} · ${d.vehicle.plateNumber} · ${d.vehicle.vehicleType}`
                : 'Sin vehículo',
              `Dueño: ${d.ownerName} · Viajes: ${d.totalTrips} · ⭐ ${d.rating.toFixed(1)}`,
            ]}
            actions={driverActions(d)}
            onAction={(action) => requestAction(action, d.id)}
          />
        ))}
      </AdminModulePage>
      {confirmModal}
    </>
  );
}
