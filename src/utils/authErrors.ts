/** Mensajes de error de autenticación — centralizados para login UI. */
export const SET_PASSWORD_REQUIRED_MESSAGE =
  'Debes crear tu contraseña antes de iniciar sesión. Toca «Crear contraseña» u «Olvidaste tu contraseña».';

export function isHttpApiErrorCode(code: string | undefined): boolean {
  if (!code) return false;
  return !['NETWORK_ERROR', 'API_URL_MISSING', 'API_URL_LOCALHOST'].includes(code);
}
