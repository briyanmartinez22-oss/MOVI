import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveStaffRoleFromPhone } from '../config/adminPermissions';
import { fetchAdminMe } from '../services/api';
import { useMockApi } from '../services/api/config';
import type { AdminStaffRole } from '../types/adminStaff';

export function useAdminStaffRole() {
  const { user } = useAuth();
  const mockMode = useMockApi();
  const [staffRole, setStaffRole] = useState<AdminStaffRole | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user || user.role !== 'admin') {
      setStaffRole(null);
      setLoading(false);
      return;
    }

    const fromUser = (user as { staffRole?: AdminStaffRole }).staffRole;
    if (fromUser) {
      setStaffRole(fromUser);
      setLoading(false);
      return;
    }

    if (mockMode) {
      const mockRole =
        resolveStaffRoleFromPhone(user.phoneNumber) ??
        ((user as { staffRole?: AdminStaffRole }).staffRole ?? 'OPS_ADMIN');
      setStaffRole(mockRole);
      setLoading(false);
      return;
    }

    const me = await fetchAdminMe();
    setStaffRole(me?.staffRole ?? null);
    setLoading(false);
  }, [user, mockMode]);

  useEffect(() => {
    void load();
  }, [load]);

  return { staffRole, loading, reload: load };
}
