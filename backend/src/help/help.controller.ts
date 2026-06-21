import { Body, Controller, Post } from '@nestjs/common';
import { writeAuditLog } from '../services/audit.service';

type HelpAnalyticsEvent = {
  event: 'help_article_opened' | 'help_search' | 'help_contact_support';
  sectionId?: string;
  query?: string;
  channel?: string;
  subject?: string;
  timestamp?: string;
};

type SupportTicketBody = {
  subject: string;
  message: string;
  category?: string;
};

@Controller('help')
export class HelpController {
  @Post('analytics/events')
  async trackEvent(@Body() body: HelpAnalyticsEvent) {
    await writeAuditLog({
      action: 'create',
      entityType: 'help_analytics',
      entityId: body.event,
      changes: {
        sectionId: body.sectionId,
        query: body.query,
        channel: body.channel,
        subject: body.subject,
        timestamp: body.timestamp ?? new Date().toISOString(),
      },
    });

    return { ok: true, recorded: true };
  }

  @Post('support/tickets')
  async createSupportTicket(@Body() body: SupportTicketBody) {
    const ticketId = `help_${Date.now()}`;

    await writeAuditLog({
      action: 'create',
      entityType: 'help_support_ticket',
      entityId: ticketId,
      changes: {
        subject: body.subject,
        message: body.message,
        category: body.category ?? 'general',
        status: 'queued',
      },
    });

    return { ok: true, ticketId };
  }
}
