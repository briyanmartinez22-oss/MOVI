import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { AdminEntityCard, type EntityAction } from '../../src/components/admin/AdminEntityCard';
import {
  approveOwner,
  deleteOwner,
  fetchAdminOwners,
  reactivateOwner,
  rejectOwner,
  suspendOwner,
} from '../../src/services/api';
import { useAdminEntityActions } from '../../src/hooks/useAdminEntityActions';

type Owner = {
  id: string;
  name: string;
  phone: string;
  mvpStatus: string;
  vehicleCount: number;
  driverCount: number;
};

function ownerActions(o: Owner): EntityAction[] {
  const actions: EntityAction[] = [];
  if (o.mvpStatus !== 'VERIFIED' && o.mvpStatus !== 'SUSPENDED') {
    actions.push('approve', 'reject');
  }
  if (o.mvpStatus === 'SUSPENDED') {
    actions.push('reactivate');
  } else {
    actions.push('suspend');
  }
  actions.push('delete');
  return actions;
}

export default function AdminOwnersScreen() {
  const router = useRouter();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setOwners((await fetchAdminOwners()) as Owner[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runEntityAction = useCallback(async (action: EntityAction, id: string) => {
    if (action === 'approve') return approveOwner(id);
    if (action === 'reject') return rejectOwner(id);
    if (action === 'suspend') return suspendOwner(id);
    if (action === 'reactivate') return reactivateOwner(id);
    if (action === 'delete') return deleteOwner(id);
    return { ok: false, error: 'Acción no soportada' };
  }, []);

  const { requestAction, confirmModal } = useAdminEntityActions(runEntityAction, load);

  return (
    <>
      <AdminModulePage
        title="Owners"
        subtitle="Propietarios · aprobación, suspensión y auditoría"
        loading={loading}
        empty={!loading && owners.length === 0 ? 'Sin propietarios' : undefined}
        onBack={() => router.replace('/admin')}
      >
        {owners.map((o) => (
          <AdminEntityCard
            key={o.id}
            title={o.name}
            mvpStatus={o.mvpStatus}
            lines={[
              o.phone,
              `Vehículos: ${o.vehicleCount} · Conductores: ${o.driverCount}`,
            ]}
            actions={ownerActions(o)}
            onAction={(action) => requestAction(action, o.id)}
          />
        ))}
      </AdminModulePage>
      {confirmModal}
    </>
  );
}
