import { Redirect } from 'expo-router';

/** Fusionado en welcome.tsx — redirige para compatibilidad */
export default function RegisterAccountRedirect() {
  return <Redirect href="/welcome" />;
}
