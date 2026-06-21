import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { useTrip } from '../context/TripContext';
import { showError, showSuccess } from '../utils/feedback';
import { getRoleHomeRoute } from '../utils/platform';
import type { TripCancelledBy } from '../utils/tripCancellation';

type Options = {
  redirect?: boolean;
  onSuccess?: () => void;
};

export function useCancelTrip() {
  const router = useRouter();
  const { user } = useAuth();
  const { cancelTrip } = useTrip();
  const [loading, setLoading] = useState(false);

  const confirmAndCancel = useCallback(
    (by: TripCancelledBy, options?: Options) => {
      Alert.alert('Cancelar viaje', '¿Deseas cancelar este viaje?', [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cancelar',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setLoading(true);
              try {
                const result = await cancelTrip(by);
                if (!result.ok) {
                  showError('No se pudo cancelar', result.error ?? 'Intenta de nuevo.');
                  return;
                }
                showSuccess('Viaje cancelado', 'Tu viaje fue cancelado correctamente.');
                options?.onSuccess?.();
                if (options?.redirect !== false) {
                  const home = getRoleHomeRoute(by === 'driver' ? 'driver' : (user?.role ?? 'passenger'));
                  router.replace(home as never);
                }
              } finally {
                setLoading(false);
              }
            })();
          },
        },
      ]);
    },
    [cancelTrip, router, user?.role]
  );

  return { confirmAndCancel, loading };
}
