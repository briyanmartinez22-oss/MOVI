import { useCallback, useEffect, useState } from 'react';
import { useMockApi } from '../services/api/config';
import { refreshProfilesFromApi, refreshOwnerFleet } from '../services/profileData';
import { useAuth } from '../context/AuthContext';

export function useProfileBootstrap(scope: 'full' | 'owner' = 'full') {
  const { user } = useAuth();
  const [loading, setLoading] = useState(!useMockApi());
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (useMockApi() || !user) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const result = scope === 'owner' ? await refreshOwnerFleet() : await refreshProfilesFromApi();
    if (!result.ok) {
      setError(result.error ?? 'No se pudo conectar con el servidor.');
    }
    setLoading(false);
  }, [user, scope]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, reload };
}
