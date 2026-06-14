import * as authService from './authService';
import { clearPermissionsAccepted } from './permissionsFlowService';
import { resetStoreToSeed } from './mockStore';
import { clearDemoChats } from './chatService';

/** Restablece datos demo y cierra la sesión de autenticación. */
export async function resetDemoEnvironment(): Promise<void> {
  await authService.logout();
  await clearPermissionsAccepted();
  await clearDemoChats();
  await resetStoreToSeed();
}
