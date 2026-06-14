import type { Router } from 'expo-router';
import {
  hasPermissionsAccepted,
  type PendingRegistrationFlow,
} from '../services/permissionsFlowService';

type NavigateOptions = {
  pendingFlow: PendingRegistrationFlow;
  /** Ruta absoluta tras aceptar permisos (p. ej. /auth/otp). */
  nextRoute: string;
  forwardParams: Record<string, string>;
};

/** Registro → Permisos → nextRoute. Si permisos ya aceptados, salta directo a nextRoute. */
export async function navigateToRegistrationPermissions(
  router: Router,
  { pendingFlow, nextRoute, forwardParams }: NavigateOptions
): Promise<void> {
  if (await hasPermissionsAccepted(pendingFlow)) {
    router.replace({ pathname: nextRoute as never, params: forwardParams });
    return;
  }

  router.push({
    pathname: '/auth/permissions',
    params: {
      pendingFlow,
      nextRoute,
      ...forwardParams,
    },
  });
}
