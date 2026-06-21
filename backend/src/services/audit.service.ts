import type { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { parseJsonField, stringifyJsonField } from '../utils/normalize';

export async function writeAuditLog(input: {
  userId?: string;
  actorRole?: string;
  action: AuditAction | string;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  const action = input.action as AuditAction;
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      actorRole: input.actorRole,
      action,
      entityType: input.entityType,
      entityId: input.entityId,
      changesJson: stringifyJsonField(input.changes ?? {}),
      beforeJson: stringifyJsonField(input.before ?? {}),
      afterJson: stringifyJsonField(input.after ?? {}),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}

export async function writeAdminAudit(
  input: Omit<Parameters<typeof writeAuditLog>[0], 'action'> & {
    action: AuditAction | string;
  }
) {
  return writeAuditLog(input);
}
