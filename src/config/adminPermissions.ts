import type { AdminStaffRole } from '../types/adminStaff';

export type AdminMenuItem = {
  title: string;
  route: string;
  icon: 'shield-checkmark' | 'people' | 'car' | 'map' | 'pulse' | 'headset' | 'cash' | 'shield' | 'document-text' | 'bar-chart' | 'person' | 'star';
  roles: AdminStaffRole[];
};

/** Rutas admin y roles permitidos (SUPER_ADMIN siempre pasa en el guard). */
export const ADMIN_ROUTE_ACCESS: Record<string, AdminStaffRole[]> = {
  '/admin': ['SUPER_ADMIN', 'OPS_ADMIN', 'SUPPORT_ADMIN', 'FINANCE_ADMIN', 'COMPLIANCE_ADMIN'],
  '/admin/operations-live': ['SUPER_ADMIN', 'OPS_ADMIN'],
  '/admin/operations': ['SUPER_ADMIN', 'OPS_ADMIN'],
  '/admin/trips': ['SUPER_ADMIN', 'OPS_ADMIN'],
  '/admin/drivers': ['SUPER_ADMIN', 'OPS_ADMIN'],
  '/admin/passengers': ['SUPER_ADMIN', 'OPS_ADMIN'],
  '/admin/ratings': ['SUPER_ADMIN', 'OPS_ADMIN', 'FINANCE_ADMIN'],
  '/admin/support': ['SUPER_ADMIN', 'SUPPORT_ADMIN'],
  '/admin/finance': ['SUPER_ADMIN', 'FINANCE_ADMIN'],
  '/admin/security': ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'],
  '/admin/audit': ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'],
  '/admin/verifications': ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'],
  '/admin/providers': ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'],
  '/admin/analytics': ['SUPER_ADMIN', 'FINANCE_ADMIN'],
};

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { title: 'Verificaciones', route: '/admin/verifications', icon: 'shield-checkmark', roles: ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'] },
  { title: 'Proveedores', route: '/admin/providers', icon: 'people', roles: ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'] },
  { title: 'Viajes y solicitudes', route: '/admin/trips', icon: 'car', roles: ['SUPER_ADMIN', 'OPS_ADMIN'] },
  { title: 'Conductores', route: '/admin/drivers', icon: 'person', roles: ['SUPER_ADMIN', 'OPS_ADMIN'] },
  { title: 'Pasajeros', route: '/admin/passengers', icon: 'people', roles: ['SUPER_ADMIN', 'OPS_ADMIN'] },
  { title: 'Calificaciones', route: '/admin/ratings', icon: 'star', roles: ['SUPER_ADMIN', 'OPS_ADMIN', 'FINANCE_ADMIN'] },
  { title: 'Mapa operacional', route: '/admin/operations', icon: 'map', roles: ['SUPER_ADMIN', 'OPS_ADMIN'] },
  { title: 'Centro de operaciones', route: '/admin/operations-live', icon: 'pulse', roles: ['SUPER_ADMIN', 'OPS_ADMIN'] },
  { title: 'Soporte operativo', route: '/admin/support', icon: 'headset', roles: ['SUPER_ADMIN', 'SUPPORT_ADMIN'] },
  { title: 'Finanzas', route: '/admin/finance', icon: 'cash', roles: ['SUPER_ADMIN', 'FINANCE_ADMIN'] },
  { title: 'Seguridad', route: '/admin/security', icon: 'shield', roles: ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'] },
  { title: 'Auditoría', route: '/admin/audit', icon: 'document-text', roles: ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'] },
  { title: 'Analítica avanzada', route: '/admin/analytics', icon: 'bar-chart', roles: ['SUPER_ADMIN', 'FINANCE_ADMIN'] },
];

function normalizeAdminPath(pathname: string): string {
  if (pathname.startsWith('/admin/trips/')) return '/admin/trips';
  return pathname.replace(/\/$/, '') || '/admin';
}

export function canAccessAdminRoute(pathname: string, staffRole: AdminStaffRole): boolean {
  if (staffRole === 'SUPER_ADMIN') return true;
  const key = normalizeAdminPath(pathname);
  const allowed = ADMIN_ROUTE_ACCESS[key];
  if (!allowed) return false;
  return allowed.includes(staffRole);
}

export function filterAdminMenuForRole(staffRole: AdminStaffRole): AdminMenuItem[] {
  if (staffRole === 'SUPER_ADMIN') return ADMIN_MENU_ITEMS;
  return ADMIN_MENU_ITEMS.filter((item) => item.roles.includes(staffRole));
}

export function resolveStaffRoleFromPhone(phone: string): AdminStaffRole | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.endsWith('12144698637')) return 'SUPER_ADMIN';
  if (digits.endsWith('70001111')) return 'OPS_ADMIN';
  if (digits.endsWith('70801111')) return 'OPS_ADMIN';
  return null;
}
