import { Redirect } from 'expo-router';

/** Compatibilidad: redirige al flujo de registro de 3 caminos. */
export default function SelectRoleRedirect() {
  return <Redirect href="/auth/register-account" />;
}
