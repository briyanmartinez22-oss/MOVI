import type { HelpSectionId } from './helpCenterContent';

/** Mapeo de rutas/pantallas → artículo de ayuda contextual. */
export const ROUTE_HELP_SECTION: Record<string, HelpSectionId> = {
  '/auth/otp': 'otp-guide',
  '/auth/login': 'otp-guide',
  '/auth/register-passenger': 'registration-guide',
  '/auth/register-account': 'registration-guide',
  '/auth/register-identity': 'registration-guide',
  '/auth/register-owner': 'registration-guide',
  '/auth/register-driver-code': 'driver-guide',
  '/driver': 'driver-guide',
  '/driver/trip-active': 'driver-guide',
  '/passenger': 'trips-guide',
  '/passenger/destination': 'trips-guide',
  '/passenger/matching': 'trips-guide',
  '/passenger/offers': 'trips-guide',
  '/passenger/trip': 'trips-guide',
  '/passenger/driver': 'trips-guide',
  '/auth/register-business': 'business-guide',
  '/welcome': 'what-is-movi',
  '/admin': 'admin-guide',
  '/owner/dashboard': 'owner-guide',
  '/business/dashboard': 'business-guide',
  '/business/request-delivery': 'business-guide',
  '/driver/subscription': 'account-status',
  '/activity': 'account-status',
};

export function resolveHelpSectionForRoute(pathname: string): HelpSectionId | undefined {
  if (ROUTE_HELP_SECTION[pathname]) return ROUTE_HELP_SECTION[pathname];

  const match = Object.entries(ROUTE_HELP_SECTION).find(([route]) =>
    pathname.startsWith(route)
  );
  return match?.[1];
}
