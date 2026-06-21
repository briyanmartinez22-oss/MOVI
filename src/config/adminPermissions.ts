import type { AdminStaffRole } from '../types/adminStaff';

/** Permiso granular de plataforma MOVI. */
export type AdminPermission =
  | 'users.view_all'
  | 'users.view_profile'
  | 'users.edit'
  | 'users.suspend'
  | 'users.delete'
  | 'users.reset'
  | 'users.change_role'
  | 'users.impersonate'
  | 'passengers.view'
  | 'passengers.edit'
  | 'passengers.delete'
  | 'passengers.force_verify'
  | 'passengers.ratings'
  | 'drivers.view'
  | 'drivers.approve'
  | 'drivers.suspend'
  | 'drivers.delete'
  | 'drivers.documents'
  | 'drivers.change_status'
  | 'drivers.earnings'
  | 'owners.view'
  | 'owners.approve'
  | 'owners.delete'
  | 'owners.fleet'
  | 'owners.reports'
  | 'businesses.view'
  | 'businesses.approve'
  | 'businesses.suspend'
  | 'businesses.delete'
  | 'businesses.deliveries'
  | 'businesses.payments'
  | 'trips.view_all'
  | 'trips.reassign'
  | 'trips.cancel'
  | 'trips.change_status'
  | 'trips.tracking'
  | 'trips.chat'
  | 'deliveries.reassign'
  | 'deliveries.cancel'
  | 'deliveries.force_status'
  | 'finance.transactions'
  | 'finance.subscriptions'
  | 'finance.revenue'
  | 'finance.reports'
  | 'finance.refunds'
  | 'support.tickets_view'
  | 'support.tickets_reply'
  | 'support.tickets_close'
  | 'support.tickets_reopen'
  | 'security.events'
  | 'security.audit'
  | 'security.suspend'
  | 'security.login_attempts'
  | 'analytics.full'
  | 'analytics.export'
  | 'config.global'
  | 'config.otp'
  | 'config.maps'
  | 'config.storage'
  | 'config.providers'
  | 'config.commissions'
  | 'config.fares'
  | 'admin.create'
  | 'admin.edit'
  | 'admin.delete'
  | 'admin.assign_permissions'
  | 'system.seeds'
  | 'system.tasks'
  | 'system.internal_tools'
  | 'system.integrations'
  | 'system.railway'
  | 'system.database'
  | 'system.websocket';

export type AdminActor = {
  role?: string;
  staffRole?: AdminStaffRole | null;
};

export type AdminMenuIcon =
  | 'grid'
  | 'pulse'
  | 'car'
  | 'people'
  | 'person'
  | 'business'
  | 'storefront'
  | 'cube'
  | 'cash'
  | 'card'
  | 'headset'
  | 'shield'
  | 'document-text'
  | 'bar-chart'
  | 'settings'
  | 'key'
  | 'construct'
  | 'map'
  | 'star'
  | 'shield-checkmark'
  | 'git-network';

export type AdminMenuItem = {
  title: string;
  route: string;
  icon: AdminMenuIcon;
  permission: AdminPermission;
  roles: AdminStaffRole[];
};

const OPS: AdminStaffRole[] = ['SUPER_ADMIN', 'OPS_ADMIN'];
const SUPPORT: AdminStaffRole[] = ['SUPER_ADMIN', 'SUPPORT_ADMIN'];
const FINANCE: AdminStaffRole[] = ['SUPER_ADMIN', 'FINANCE_ADMIN'];
const COMPLIANCE: AdminStaffRole[] = ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'];
const SUPER_ONLY: AdminStaffRole[] = ['SUPER_ADMIN'];

/** SUPER_ADMIN — acceso total; otros roles según matriz. */
export function canAccess(actor: AdminActor | null | undefined, permission: AdminPermission): boolean {
  if (!actor) return false;
  if (actor.staffRole === 'SUPER_ADMIN') return true;
  if (actor.role === 'admin' && !actor.staffRole) return permission.startsWith('system.');
  const allowed = PERMISSION_MATRIX[permission];
  if (!allowed?.length) return false;
  if (!actor.staffRole) return false;
  return allowed.includes(actor.staffRole);
}

const PERMISSION_MATRIX: Record<AdminPermission, AdminStaffRole[]> = {
  'users.view_all': [...COMPLIANCE, ...OPS],
  'users.view_profile': [...COMPLIANCE, ...OPS, ...SUPPORT],
  'users.edit': COMPLIANCE,
  'users.suspend': COMPLIANCE,
  'users.delete': SUPER_ONLY,
  'users.reset': SUPER_ONLY,
  'users.change_role': SUPER_ONLY,
  'users.impersonate': SUPER_ONLY,
  'passengers.view': OPS,
  'passengers.edit': OPS,
  'passengers.delete': SUPER_ONLY,
  'passengers.force_verify': COMPLIANCE,
  'passengers.ratings': [...OPS, ...FINANCE],
  'drivers.view': OPS,
  'drivers.approve': COMPLIANCE,
  'drivers.suspend': COMPLIANCE,
  'drivers.delete': SUPER_ONLY,
  'drivers.documents': COMPLIANCE,
  'drivers.change_status': OPS,
  'drivers.earnings': FINANCE,
  'owners.view': COMPLIANCE,
  'owners.approve': COMPLIANCE,
  'owners.delete': SUPER_ONLY,
  'owners.fleet': COMPLIANCE,
  'owners.reports': FINANCE,
  'businesses.view': OPS,
  'businesses.approve': COMPLIANCE,
  'businesses.suspend': COMPLIANCE,
  'businesses.delete': SUPER_ONLY,
  'businesses.deliveries': OPS,
  'businesses.payments': FINANCE,
  'trips.view_all': OPS,
  'trips.reassign': OPS,
  'trips.cancel': OPS,
  'trips.change_status': OPS,
  'trips.tracking': OPS,
  'trips.chat': [...OPS, ...SUPPORT],
  'deliveries.reassign': OPS,
  'deliveries.cancel': OPS,
  'deliveries.force_status': OPS,
  'finance.transactions': FINANCE,
  'finance.subscriptions': FINANCE,
  'finance.revenue': FINANCE,
  'finance.reports': FINANCE,
  'finance.refunds': FINANCE,
  'support.tickets_view': SUPPORT,
  'support.tickets_reply': SUPPORT,
  'support.tickets_close': SUPPORT,
  'support.tickets_reopen': SUPPORT,
  'security.events': COMPLIANCE,
  'security.audit': COMPLIANCE,
  'security.suspend': COMPLIANCE,
  'security.login_attempts': COMPLIANCE,
  'analytics.full': FINANCE,
  'analytics.export': FINANCE,
  'config.global': SUPER_ONLY,
  'config.otp': SUPER_ONLY,
  'config.maps': SUPER_ONLY,
  'config.storage': SUPER_ONLY,
  'config.providers': SUPER_ONLY,
  'config.commissions': SUPER_ONLY,
  'config.fares': SUPER_ONLY,
  'admin.create': SUPER_ONLY,
  'admin.edit': SUPER_ONLY,
  'admin.delete': SUPER_ONLY,
  'admin.assign_permissions': SUPER_ONLY,
  'system.seeds': SUPER_ONLY,
  'system.tasks': SUPER_ONLY,
  'system.internal_tools': SUPER_ONLY,
  'system.integrations': SUPER_ONLY,
  'system.railway': SUPER_ONLY,
  'system.database': SUPER_ONLY,
  'system.websocket': SUPER_ONLY,
};

/** Menú lateral completo SUPER_ADMIN */
export const SUPER_ADMIN_SIDEBAR: AdminMenuItem[] = [
  { title: 'Dashboard', route: '/admin', icon: 'grid', permission: 'analytics.full', roles: SUPER_ONLY },
  { title: 'Operations Live', route: '/admin/operations-live', icon: 'pulse', permission: 'trips.tracking', roles: OPS },
  { title: 'Trips', route: '/admin/trips', icon: 'car', permission: 'trips.view_all', roles: OPS },
  { title: 'Passengers', route: '/admin/passengers', icon: 'people', permission: 'passengers.view', roles: OPS },
  { title: 'Drivers', route: '/admin/drivers', icon: 'person', permission: 'drivers.view', roles: OPS },
  { title: 'Owners', route: '/admin/owners', icon: 'business', permission: 'owners.view', roles: COMPLIANCE },
  { title: 'Businesses', route: '/admin/businesses', icon: 'storefront', permission: 'businesses.view', roles: OPS },
  { title: 'Deliveries', route: '/admin/deliveries', icon: 'cube', permission: 'deliveries.reassign', roles: OPS },
  { title: 'Finance', route: '/admin/finance', icon: 'cash', permission: 'finance.transactions', roles: FINANCE },
  { title: 'Subscriptions', route: '/admin/subscriptions', icon: 'card', permission: 'finance.subscriptions', roles: FINANCE },
  { title: 'Support', route: '/admin/support', icon: 'headset', permission: 'support.tickets_view', roles: SUPPORT },
  { title: 'Security', route: '/admin/security', icon: 'shield', permission: 'security.events', roles: COMPLIANCE },
  { title: 'Audit', route: '/admin/audit', icon: 'document-text', permission: 'security.audit', roles: COMPLIANCE },
  { title: 'Analytics', route: '/admin/analytics', icon: 'bar-chart', permission: 'analytics.full', roles: FINANCE },
  { title: 'Integrations', route: '/admin/integrations', icon: 'git-network', permission: 'system.integrations', roles: SUPER_ONLY },
  { title: 'Settings', route: '/admin/settings', icon: 'settings', permission: 'config.global', roles: SUPER_ONLY },
  { title: 'Admins', route: '/admin/admins', icon: 'key', permission: 'admin.create', roles: SUPER_ONLY },
  { title: 'System Tools', route: '/admin/system-tools', icon: 'construct', permission: 'system.internal_tools', roles: SUPER_ONLY },
];

/** Menú legacy para roles no SUPER_ADMIN */
export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { title: 'Verificaciones', route: '/admin/verifications', icon: 'shield-checkmark', permission: 'drivers.approve', roles: COMPLIANCE },
  { title: 'Proveedores', route: '/admin/providers', icon: 'people', permission: 'owners.view', roles: COMPLIANCE },
  { title: 'Viajes y solicitudes', route: '/admin/trips', icon: 'car', permission: 'trips.view_all', roles: OPS },
  { title: 'Conductores', route: '/admin/drivers', icon: 'person', permission: 'drivers.view', roles: OPS },
  { title: 'Pasajeros', route: '/admin/passengers', icon: 'people', permission: 'passengers.view', roles: OPS },
  { title: 'Calificaciones', route: '/admin/ratings', icon: 'star', permission: 'passengers.ratings', roles: [...OPS, ...FINANCE] },
  { title: 'Mapa operacional', route: '/admin/operations', icon: 'map', permission: 'trips.tracking', roles: OPS },
  { title: 'Centro de operaciones', route: '/admin/operations-live', icon: 'pulse', permission: 'trips.tracking', roles: OPS },
  { title: 'Soporte operativo', route: '/admin/support', icon: 'headset', permission: 'support.tickets_view', roles: SUPPORT },
  { title: 'Finanzas', route: '/admin/finance', icon: 'cash', permission: 'finance.transactions', roles: FINANCE },
  { title: 'Seguridad', route: '/admin/security', icon: 'shield', permission: 'security.events', roles: COMPLIANCE },
  { title: 'Auditoría', route: '/admin/audit', icon: 'document-text', permission: 'security.audit', roles: COMPLIANCE },
  { title: 'Analítica avanzada', route: '/admin/analytics', icon: 'bar-chart', permission: 'analytics.full', roles: FINANCE },
];

const ROUTE_PERMISSION: Record<string, AdminPermission> = Object.fromEntries(
  [...SUPER_ADMIN_SIDEBAR, ...ADMIN_MENU_ITEMS].map((item) => [item.route, item.permission])
);

function normalizeAdminPath(pathname: string): string {
  if (pathname.startsWith('/admin/trips/')) return '/admin/trips';
  return pathname.replace(/\/$/, '') || '/admin';
}

export function getRoutePermission(pathname: string): AdminPermission | null {
  const key = normalizeAdminPath(pathname);
  return ROUTE_PERMISSION[key] ?? null;
}

export function canAccessAdminRoute(pathname: string, actor: AdminActor): boolean {
  if (actor.staffRole === 'SUPER_ADMIN') return true;
  const permission = getRoutePermission(pathname);
  if (!permission) return actor.staffRole != null;
  return canAccess(actor, permission);
}

export function filterAdminMenuForRole(actor: AdminActor): AdminMenuItem[] {
  if (actor.staffRole === 'SUPER_ADMIN') {
    return SUPER_ADMIN_SIDEBAR.filter((item) => canAccess(actor, item.permission));
  }
  return ADMIN_MENU_ITEMS.filter(
    (item) => actor.staffRole && item.roles.includes(actor.staffRole) && canAccess(actor, item.permission)
  );
}

export function resolveStaffRoleFromPhone(phone: string): AdminStaffRole | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.endsWith('12144698637')) return 'SUPER_ADMIN';
  if (digits.endsWith('70001111')) return 'OPS_ADMIN';
  if (digits.endsWith('70801111')) return 'OPS_ADMIN';
  return null;
}
