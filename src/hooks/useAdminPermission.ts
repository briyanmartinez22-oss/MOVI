import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminStaffRole } from './useAdminStaffRole';
import {
  canAccess,
  type AdminActor,
  type AdminPermission,
} from '../config/adminPermissions';

export function useAdminActor(): { actor: AdminActor; loading: boolean } {
  const { user } = useAuth();
  const { staffRole, loading } = useAdminStaffRole();

  const actor = useMemo<AdminActor>(
    () => ({
      role: user?.role,
      staffRole: staffRole ?? (user as { staffRole?: AdminActor['staffRole'] })?.staffRole ?? null,
    }),
    [user, staffRole]
  );

  return { actor, loading };
}

export function useAdminPermission(permission: AdminPermission): boolean {
  const { actor, loading } = useAdminActor();
  if (loading) return false;
  return canAccess(actor, permission);
}
