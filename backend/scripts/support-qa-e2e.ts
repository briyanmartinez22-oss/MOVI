/** QA — Support tickets (FASE 5) */
import { loginAsSuperAdmin, req, API } from './admin-qa-auth';

const results: Array<{ step: string; status: 'PASS' | 'FAIL'; detail?: string }> = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Support QA —', API);
  const token = await loginAsSuperAdmin();
  record('Auth SuperAdmin', !!token);

  const me = await req('/admin/me', undefined, token);
  const userId = me.json.data?.user?.userId as string | undefined;

  const list = await req('/admin/support/tickets', undefined, token);
  record('GET tickets', list.status === 200 && Array.isArray(list.json.data?.tickets));

  const create = await req(
    '/admin/support/tickets',
    {
      userId: userId ?? 'demo',
      subject: 'QA ticket',
      description: 'Automated test',
      priority: 'low',
    },
    token
  );
  record('POST ticket', create.status === 200 || create.status === 201, create.json.error);

  const ticketId = create.json.data?.ticket?.id as string | undefined;
  if (ticketId) {
    const patch = await req(
      `/admin/support/tickets/${ticketId}`,
      { status: 'assigned' },
      token,
      'PATCH'
    );
    record('PATCH ticket', patch.status === 200, patch.json.error);

    const msg = await req(
      `/admin/support/tickets/${ticketId}/messages`,
      { text: 'QA message' },
      token
    );
    record('POST message', msg.status === 200 || msg.status === 201, msg.json.error);
  }

  const failed = results.filter((r) => r.status === 'FAIL').length;
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
