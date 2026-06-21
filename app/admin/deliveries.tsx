import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { fetchAdminDeliveries } from '../../src/services/api';
import { AdminListCard, AdminModulePage } from '../../src/components/admin/AdminModulePage';

type Delivery = {
  id: string;
  tripId: string;
  recipientName?: string | null;
  trip?: { passengerName: string; lifecycleStatus: string; originName: string; destinationName: string };
};

export default function AdminDeliveriesScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setItems((await fetchAdminDeliveries()) as Delivery[]);
      setLoading(false);
    })();
  }, []);

  return (
    <AdminModulePage
      title="Deliveries"
      subtitle="Entregas y paquetería"
      loading={loading}
      empty={items.length === 0 ? 'Sin entregas' : undefined}
      onBack={() => router.replace('/admin')}
    >
      {items.map((d) => (
        <AdminListCard
          key={d.id}
          title={d.trip?.passengerName ?? d.recipientName ?? 'Entrega'}
          lines={[
            `Viaje: ${d.tripId.slice(0, 10)}…`,
            d.trip
              ? `${d.trip.originName} → ${d.trip.destinationName}`
              : 'Sin ruta',
            `Estado: ${d.trip?.lifecycleStatus ?? '—'}`,
          ]}
        />
      ))}
    </AdminModulePage>
  );
}
