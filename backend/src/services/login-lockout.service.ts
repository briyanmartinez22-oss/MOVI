import {
  checkRateLimit,
  clearAllLoginLockouts,
  clearLoginLockoutsForPhones,
  isRateLimited,
  resetRateLimit,
} from './rateLimit.service';

const LOGIN_FAIL_MAX = 5;
const LOGIN_FAIL_WINDOW_MS = 15 * 60 * 1000;

export function loginRateLimitKey(phoneNumber: string): string {
  return `login-fail:${phoneNumber}`;
}

export function isLoginLocked(phoneNumber: string): boolean {
  return isRateLimited(loginRateLimitKey(phoneNumber), LOGIN_FAIL_MAX, LOGIN_FAIL_WINDOW_MS);
}

export function recordLoginFailure(phoneNumber: string): void {
  checkRateLimit(loginRateLimitKey(phoneNumber), LOGIN_FAIL_MAX, LOGIN_FAIL_WINDOW_MS);
}

export function clearLoginFailures(phoneNumber: string): void {
  resetRateLimit(loginRateLimitKey(phoneNumber));
}

export const GENERIC_LOGIN_ERROR =
  'Teléfono o contraseña incorrectos. Verifica tus datos e intenta de nuevo.';

export { clearAllLoginLockouts, clearLoginLockoutsForPhones };
