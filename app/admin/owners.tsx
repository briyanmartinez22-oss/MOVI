import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
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
  triggerOwnerPasswordReset,
} from '../../src/services/api';
import { useAdminEntityActions } from '../../src/hooks/useAdminEntityActions';

type Owner = {
  id: string;
  name: string;
  phone: string;
  mvpStatus: string;
  vehicleCount: number;
  driverCount: number;
  hasPasswordHash?: boolean;
};

function ownerActions(o: Owner): EntityAction[] {
  const actions: EntityAction[] = ['resetPassword'];
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
    if (action === 'resetPassword') {
      const res = await triggerOwnerPasswordReset(id);
      if (res.ok && res.data) {
        const data = res.data as { message?: string };
        Alert.alert(
          'OTP enviado',
          data.message ?? 'El dueño recibirá un código para crear o restablecer su contraseña.'
        );
      }
      return res;
    }
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
              `Contraseña: ${o.hasPasswordHash ? 'configurada' : 'pendiente (OTP)'}`,
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
