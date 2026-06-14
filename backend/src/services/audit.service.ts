import type { AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { stringifyJsonField } from '../utils/normalize';

export async function writeAuditLog(input: {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      changesJson: stringifyJsonField(input.changes ?? {}),
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
