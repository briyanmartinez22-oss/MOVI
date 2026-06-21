import { prisma } from '../lib/prisma';
import { parseJsonField } from '../utils/normalize';

export async function searchAuditLogs(filters: {
  userId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  limit?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action as never;
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.entityId) where.entityId = filters.entityId;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: filters.limit ?? 100,
    include: {
      user: { select: { id: true, fullName: true, role: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    actor: r.user,
    actorRole: r.actorRole,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    changes: parseJsonField(r.changesJson, {}),
    before: parseJsonField(r.beforeJson, {}),
    after: parseJsonField(r.afterJson, {}),
    ipAddress: r.ipAddress,
    userAgent: r.userAgent,
    createdAt: r.createdAt.toISOString(),
  }));
}
