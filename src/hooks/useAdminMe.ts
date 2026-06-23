import { useAuth } from '../context/AuthContext';
import { useAdminStaffRole } from './useAdminStaffRole';
import type { AdminStaffRole } from '../types/adminStaff';

/** Admin actor context (role + basic user info). */
export function useAdminMe() {
  const { user } = useAuth();
  const { staffRole, loading } = useAdminStaffRole();

  const actor = user
    ? {
        userId: user.userId,
        staffRole: (staffRole ?? (user as { staffRole?: AdminStaffRole }).staffRole) as
          | AdminStaffRole
          | undefined,
        role: user.role,
      }
    : null;

  return { actor, loading };
}
