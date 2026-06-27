import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getOwnerByUserId } from '../services/profileData';
import { ownerMustCompleteOnboarding } from '../utils/ownerVerificationFlow';

/** Redirige owners en borrador/rechazado a la pantalla de verificación obligatoria. */
export function useOwnerVerificationRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profileRevision } = useAuth();
  const owner = user ? getOwnerByUserId(user.userId) : null;

  useEffect(() => {
    if (!user || user.role !== 'owner' || !owner?.id) return;
    if (!ownerMustCompleteOnboarding(owner.status)) return;
    if (pathname.includes('/owner/account')) return;

    console.log('[OWNER_ONBOARDING_DEBUG]', {
      action: 'redirect_to_account',
      status: owner.status,
      from: pathname,
    });
    router.replace('/owner/account');
  }, [user, owner?.id, owner?.status, pathname, profileRevision, router]);
}
