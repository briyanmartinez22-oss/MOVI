import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { fetchAdminSubscriptions } from '../../src/services/api';
import { AdminListCard, AdminModulePage } from '../../src/components/admin/AdminModulePage';

type Sub = {
  id: string;
  driverName: string;
  driverPhone: string;
  status: string;
  monthlyAmountUsd: number;
};

export default function AdminSubscriptionsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setItems((await fetchAdminSubscriptions()) as Sub[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AdminModulePage
      title="Subscriptions"
      subtitle="Suscripciones de conductores"
      loading={loading}
      empty={items.length === 0 ? 'Sin suscripciones' : undefined}
      onBack={() => router.replace('/admin')}
    >
      {items.map((s) => (
        <AdminListCard
          key={s.id}
          title={s.driverName}
          lines={[s.driverPhone, `Estado: ${s.status}`, `MRR: $${s.monthlyAmountUsd}/mes`]}
        />
      ))}
    </AdminModulePage>
  );
}
