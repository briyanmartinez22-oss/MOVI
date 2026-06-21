import type { AdminStaffRole } from '@prisma/client';

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

const SUPER_ONLY: AdminStaffRole[] = ['SUPER_ADMIN'];
const OPS: AdminStaffRole[] = ['SUPER_ADMIN', 'OPS_ADMIN'];
const SUPPORT: AdminStaffRole[] = ['SUPER_ADMIN', 'SUPPORT_ADMIN'];
const FINANCE: AdminStaffRole[] = ['SUPER_ADMIN', 'FINANCE_ADMIN'];
const COMPLIANCE: AdminStaffRole[] = ['SUPER_ADMIN', 'COMPLIANCE_ADMIN'];

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

/** SUPER_ADMIN tiene acceso total — ignora cualquier restricción. */
export function canAccess(actor: AdminActor | null | undefined, permission: AdminPermission): boolean {
  if (!actor) return false;
  if (actor.staffRole === 'SUPER_ADMIN') return true;
  const allowed = PERMISSION_MATRIX[permission];
  if (!allowed?.length || !actor.staffRole) return false;
  return allowed.includes(actor.staffRole);
}

export function canAccessStaffRole(actual: AdminStaffRole, allowed: AdminStaffRole[]): boolean {
  if (actual === 'SUPER_ADMIN') return true;
  if (allowed.includes(actual)) return true;
  return false;
}
