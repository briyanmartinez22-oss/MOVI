/** QA — Finance admin (FASE 6) */
import { loginAsSuperAdmin, req, API } from './admin-qa-auth';

const results: Array<{ step: string; status: 'PASS' | 'FAIL'; detail?: string }> = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Finance QA —', API);
  const token = await loginAsSuperAdmin();
  record('Auth SuperAdmin', !!token);

  const summary = await req('/admin/finance/summary', undefined, token);
  record('GET summary', summary.status === 200, summary.json.error);

  const payments = await req('/admin/finance/payments', undefined, token);
  record(
    'GET payments',
    payments.status === 200 && Array.isArray(payments.json.data?.payments),
    payments.json.error
  );

  const subs = await req('/admin/finance/subscriptions', undefined, token);
  record(
    'GET subscriptions',
    subs.status === 200 && Array.isArray(subs.json.data?.subscriptions),
    subs.json.error
  );

  const refund = await req(
    '/admin/finance/refunds',
    { paymentId: 'qa-placeholder', reason: 'qa' },
    token
  );
  record(
    'POST refund (placeholder)',
    refund.status === 200 || refund.status === 400,
    refund.json.error
  );

  const failed = results.filter((r) => r.status === 'FAIL').length;
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
