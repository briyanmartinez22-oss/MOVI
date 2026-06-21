import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { AdminModulePage } from '../../src/components/admin/AdminModulePage';
import { AdminEntityCard, type EntityAction } from '../../src/components/admin/AdminEntityCard';
import {
  approveBusiness,
  deleteBusiness,
  fetchAdminBusinesses,
  reactivateBusiness,
  rejectBusiness,
  suspendBusiness,
} from '../../src/services/api';
import { useAdminEntityActions } from '../../src/hooks/useAdminEntityActions';

type Business = {
  id: string;
  businessName: string;
  businessPhone: string;
  status: string;
  mvpStatus?: string;
  totalDeliveries: number;
};

function businessActions(b: Business): EntityAction[] {
  const status = b.mvpStatus ?? b.status;
  const actions: EntityAction[] = [];
  if (status === 'PENDING' || status === 'pending' || status === 'REJECTED' || status === 'rejected') {
    actions.push('approve', 'reject');
  }
  if (status === 'SUSPENDED' || status === 'suspended') {
    actions.push('reactivate');
  } else if (status === 'VERIFIED' || status === 'approved') {
    actions.push('suspend');
  } else if (status !== 'REJECTED' && status !== 'rejected') {
    actions.push('suspend');
  }
  actions.push('delete');
  return actions;
}

export default function AdminBusinessesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems((await fetchAdminBusinesses()) as Business[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runEntityAction = useCallback(async (action: EntityAction, id: string) => {
    if (action === 'approve') return approveBusiness(id);
    if (action === 'reject') return rejectBusiness(id);
    if (action === 'suspend') return suspendBusiness(id);
    if (action === 'reactivate') return reactivateBusiness(id);
    if (action === 'delete') return deleteBusiness(id);
    return { ok: false, error: 'Acción no soportada' };
  }, []);

  const { requestAction, confirmModal } = useAdminEntityActions(runEntityAction, load);

  return (
    <>
      <AdminModulePage
        title="Businesses"
        subtitle="Comercios · aprobación, suspensión y auditoría"
        loading={loading}
        empty={!loading && items.length === 0 ? 'Sin comercios' : undefined}
        onBack={() => router.replace('/admin')}
      >
        {items.map((b) => (
          <AdminEntityCard
            key={b.id}
            title={b.businessName}
            mvpStatus={b.mvpStatus ?? b.status}
            lines={[b.businessPhone, `Entregas: ${b.totalDeliveries}`]}
            actions={businessActions(b)}
            onAction={(action) => requestAction(action, b.id)}
          />
        ))}
      </AdminModulePage>
      {confirmModal}
    </>
  );
}
