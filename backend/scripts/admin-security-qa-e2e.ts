/** QA — Security admin (FASE 7) */
import { loginAsSuperAdmin, req, API } from './admin-qa-auth';

const results: Array<{ step: string; status: 'PASS' | 'FAIL'; detail?: string }> = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Security QA —', API);
  const token = await loginAsSuperAdmin();
  record('Auth SuperAdmin', !!token);

  const summary = await req('/admin/security/summary', undefined, token);
  record('GET summary', summary.status === 200, summary.json.error);

  const events = await req('/admin/security/events', undefined, token);
  record(
    'GET events',
    events.status === 200 && Array.isArray(events.json.data?.audits),
    events.json.error
  );

  const audit = await req('/admin/audit', undefined, token);
  record(
    'GET audit',
    audit.status === 200 && Array.isArray(audit.json.data?.logs),
    audit.json.error
  );

  const alerts = await req('/admin/alerts', undefined, token);
  record(
    'GET alerts',
    alerts.status === 200 && Array.isArray(alerts.json.data?.alerts),
    alerts.json.error
  );

  const failed = results.filter((r) => r.status === 'FAIL').length;
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
