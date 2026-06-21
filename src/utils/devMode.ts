/** Herramientas internas / DX — visibles solo para SUPER_ADMIN en beta y producción. */
import type { AdminStaffRole } from '../types/adminStaff';

export function isSuperAdminStaffRole(staffRole?: AdminStaffRole | null): boolean {
  return staffRole === 'SUPER_ADMIN';
}

export function isInternalToolsEnabled(staffRole?: AdminStaffRole | null): boolean {
  if (isSuperAdminStaffRole(staffRole)) return true;
  return __DEV__ === true && process.env.NODE_ENV === 'development';
}

/** @deprecated use isInternalToolsEnabled */
export function isDevDiagnosticsEnabled(staffRole?: AdminStaffRole | null): boolean {
  return isInternalToolsEnabled(staffRole);
}

export function isDemoOtpHintEnabled(): boolean {
  return __DEV__ === true && process.env.EXPO_PUBLIC_DEMO_OTP_ENABLED === 'true';
}
