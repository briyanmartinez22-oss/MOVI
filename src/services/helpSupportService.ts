import { apiPost } from './api/client';

export type SupportTicketInput = {
  subject: string;
  message: string;
  category?: string;
  userId?: string;
};

/** Stub preparado para conectar ticketing real (Zendesk, Freshdesk, email queue, etc.). */
export async function submitSupportTicket(input: SupportTicketInput): Promise<{ ok: boolean }> {
  const res = await apiPost<{ ticketId: string }>(
    '/help/support/tickets',
    {
      subject: input.subject,
      message: input.message,
      category: input.category ?? 'general',
    },
    { auth: false }
  );

  if (res.ok) return { ok: true };

  if (__DEV__) {
    console.log('[help-support:local-fallback]', input);
    return { ok: true };
  }

  return { ok: false };
}
