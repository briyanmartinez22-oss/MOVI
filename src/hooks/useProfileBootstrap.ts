import { useCallback, useEffect, useRef, useState } from 'react';
import { useMockApi } from '../services/api/config';
import { refreshProfilesFromApi, refreshOwnerFleet } from '../services/profileData';
import { isProfileHydrated, markProfileHydrated } from '../services/profileHydration';
import { useAuth } from '../context/AuthContext';

export function useProfileBootstrap(scope: 'full' | 'owner' = 'full') {
  const { user } = useAuth();
  const userId = user?.userId ?? null;
  const alreadyHydrated = userId ? isProfileHydrated(scope, userId) : false;
  const [loading, setLoading] = useState(!useMockApi() && !alreadyHydrated);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const reload = useCallback(
    async (force = false) => {
      if (useMockApi() || !userId) {
        setLoading(false);
        setError(null);
        return;
      }

      if (!force && isProfileHydrated(scope, userId)) {
        setLoading(false);
        setError(null);
        return;
      }

      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setLoading(true);
      setError(null);

      try {
        if (scope === 'owner') {
          const profilesResult = await refreshProfilesFromApi();
          if (!profilesResult.ok) {
            setError(profilesResult.error ?? 'No se pudo conectar con el servidor.');
            return;
          }
          if (force) {
            const fleetResult = await refreshOwnerFleet();
            if (!fleetResult.ok) {
              setError(fleetResult.error ?? 'No se pudo conectar con el servidor.');
              return;
            }
          }
          markProfileHydrated('owner', userId);
        } else {
          const result = await refreshProfilesFromApi();
          if (!result.ok) {
            setError(result.error ?? 'No se pudo conectar con el servidor.');
            return;
          }
          markProfileHydrated('full', userId);
        }
      } finally {
        inFlightRef.current = false;
        setLoading(false);
      }
    },
    [userId, scope]
  );

  useEffect(() => {
    void reload();
  }, [reload]);

  return { loading, error, reload };
}
