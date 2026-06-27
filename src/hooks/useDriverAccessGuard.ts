import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { canDriverOperate, getDriverFlowPhase } from '../domain/moviFlow';
import {
  getDriverByUserId,
  getDriverSubscription,
  getOwnerById,
  getVehicle,
} from '../services/profileData';
import { canDriverOperateSubscription } from '../services/subscriptionService';

/** Redirige conductores no habilitados a la pantalla de estado operativo. */
export function useDriverAccessGuard() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profileRevision } = useAuth();
  const driver = user ? getDriverByUserId(user.userId) : null;
  const vehicle = driver ? getVehicle(driver.vehicleId) : undefined;
  const owner = driver ? getOwnerById(driver.ownerId) : undefined;
  const subscription = driver ? getDriverSubscription(driver.id) : undefined;
  const verification = canDriverOperate({ owner, vehicle, driver: driver ?? undefined });
  const subscriptionGuard = canDriverOperateSubscription(subscription);
  const operation = {
    allowed: verification.allowed && subscriptionGuard.allowed,
    reason: !subscriptionGuard.allowed ? subscriptionGuard.reason : verification.reason,
  };

  useEffect(() => {
    if (!user || user.role !== 'driver' || !driver?.id) return;
    if (operation.allowed) return;
    if (pathname.includes('/driver/verification-status')) return;
    if (pathname.includes('/driver/subscription')) return;

    console.log('[MOVI_FLOW_DEBUG]', {
      action: 'redirect_driver_status',
      driverPhase: getDriverFlowPhase(driver.status),
      reason: operation.reason,
      from: pathname,
    });
    router.replace('/driver/verification-status');
  }, [user, driver?.id, driver?.status, operation.allowed, operation.reason, pathname, profileRevision, router]);
}
