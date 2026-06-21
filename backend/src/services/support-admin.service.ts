import type { SupportTicketStatus, SupportTicketPriority } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { writeAdminAudit } from './audit.service';

export async function listSupportTickets(status?: string) {
  const where =
    status && status !== 'all'
      ? { status: status as SupportTicketStatus }
      : {};

  const tickets = await prisma.supportTicket.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    include: {
      user: { select: { id: true, fullName: true, phoneNumber: true, role: true } },
      messages: { orderBy: { createdAt: 'asc' }, take: 5 },
    },
  });

  return tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    description: t.description,
    status: t.status,
    priority: t.priority,
    category: t.category,
    assignedTo: t.assignedTo,
    tripId: t.tripId,
    driverId: t.driverId,
    businessId: t.businessId,
    user: t.user,
    messageCount: t.messages.length,
    recentMessages: t.messages.map((m) => ({
      id: m.id,
      authorId: m.authorId,
      authorRole: m.authorRole,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
    })),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    resolvedAt: t.resolvedAt?.toISOString() ?? null,
  }));
}

export async function createSupportTicket(
  input: {
    userId: string;
    subject: string;
    description: string;
    priority?: SupportTicketPriority;
    category?: string;
    tripId?: string;
    driverId?: string;
    businessId?: string;
    assignedTo?: string;
  },
  adminUserId: string,
  actorRole?: string
) {
  const ticket = await prisma.supportTicket.create({
    data: {
      userId: input.userId,
      subject: input.subject,
      description: input.description,
      priority: input.priority ?? 'medium',
      category: input.category,
      tripId: input.tripId,
      driverId: input.driverId,
      businessId: input.businessId,
      assignedTo: input.assignedTo,
      status: input.assignedTo ? 'assigned' : 'open',
    },
  });

  await prisma.supportTicketMessage.create({
    data: {
      ticketId: ticket.id,
      authorId: adminUserId,
      authorRole: actorRole ?? 'admin',
      body: input.description,
    },
  });

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'ticket_create',
    entityType: 'support_ticket',
    entityId: ticket.id,
    after: { subject: ticket.subject, tripId: ticket.tripId },
  });

  return ticket;
}

export async function updateSupportTicket(
  ticketId: string,
  input: {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    assignedTo?: string;
  },
  adminUserId: string,
  actorRole?: string
) {
  const before = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!before) return { ok: false as const, error: 'Ticket no encontrado' };

  const ticket = await prisma.supportTicket.update({
    where: { id: ticketId },
    data: {
      ...input,
      resolvedAt: input.status === 'resolved' || input.status === 'closed' ? new Date() : undefined,
    },
  });

  void writeAdminAudit({
    userId: adminUserId,
    actorRole,
    action: 'ticket_update',
    entityType: 'support_ticket',
    entityId: ticketId,
    before: { status: before.status, assignedTo: before.assignedTo },
    after: { status: ticket.status, assignedTo: ticket.assignedTo },
  });

  return { ok: true as const, ticket };
}

export async function addSupportTicketMessage(
  ticketId: string,
  authorId: string,
  authorRole: string,
  body: string
) {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) return { ok: false as const, error: 'Ticket no encontrado' };

  const message = await prisma.supportTicketMessage.create({
    data: { ticketId, authorId, authorRole, body },
  });

  await prisma.supportTicket.update({
    where: { id: ticketId },
    data: { updatedAt: new Date() },
  });

  return {
    ok: true as const,
    message: {
      id: message.id,
      body: message.body,
      authorId: message.authorId,
      authorRole: message.authorRole,
      createdAt: message.createdAt.toISOString(),
    },
  };
}

export async function getUserSupportHistory(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
}
