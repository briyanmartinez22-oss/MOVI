#!/usr/bin/env tsx
/**
 * Limpia lockouts de login en memoria (reinicio alternativo sin reiniciar el proceso).
 * Usage: npm run db:clear-login-lockouts
 *        RESET_CLEAR_LOGIN_PHONES=+50370328885,+12144698637 npm run db:clear-login-lockouts
 */
import {
  clearAllLoginLockouts,
  clearLoginLockoutsForPhones,
} from '../src/services/login-lockout.service';
import { normalizePhone } from '../src/utils/phone';

const phones = (process.env.RESET_CLEAR_LOGIN_PHONES ?? '')
  .split(/[,;\s]+/)
  .map((p) => normalizePhone(p.trim()))
  .filter(Boolean);

if (phones.length > 0) {
  clearLoginLockoutsForPhones(phones);
  console.log('Login lockouts cleared for:', phones.join(', '));
} else {
  clearAllLoginLockouts();
  console.log('All login lockouts cleared.');
}
