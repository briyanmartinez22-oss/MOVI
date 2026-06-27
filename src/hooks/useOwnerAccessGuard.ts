import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getOwnerFlowPhase, ownerCanOperateFleet, ownerMustCompleteOnboarding } from '../domain/moviFlow';
import { getOwnerByUserId } from '../services/profileData';

/** Dueño en borrador/rechazado → cuenta/verificación obligatoria. */
export function useOwnerAccessGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profileRevision } = useAuth();
  const owner = user ? getOwnerByUserId(user.userId) : null;

  useEffect(() => {
    if (!user || user.role !== 'owner' || !owner?.id) return;

    if (ownerMustCompleteOnboarding(owner.status)) {
      if (pathname.includes('/owner/account')) return;
      console.log('[MOVI_FLOW_DEBUG]', {
        action: 'redirect_owner_account',
        phase: getOwnerFlowPhase(owner.status),
        from: pathname,
      });
      router.replace('/owner/account');
      return;
    }

    if (!ownerCanOperateFleet(owner.status)) {
      const blockedRoutes = ['/owner/vehicles', '/owner/register-vehicle', '/owner/invite-driver', '/owner/reports'];
      if (blockedRoutes.some((route) => pathname.startsWith(route))) {
        console.log('[MOVI_FLOW_DEBUG]', {
          action: 'redirect_owner_account_from_fleet',
          phase: getOwnerFlowPhase(owner.status),
          from: pathname,
        });
        router.replace('/owner/account');
      }
    }
  }, [user, owner?.id, owner?.status, pathname, profileRevision, router]);
}
