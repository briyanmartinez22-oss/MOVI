#!/usr/bin/env tsx
/**
 * QA — Beta cerrada: SuperAdmin real + módulos admin + WebSocket
 * Usage: npm run qa:beta-closed
 */
import WebSocket from 'ws';
import { loginAsSuperAdmin, req, API, ADMIN_QA_PHONE } from './admin-qa-auth';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function testAdminWebSocket(token: string): Promise<boolean> {
  return new Promise((resolve) => {
    const url = `${API.replace(/^http/, 'ws')}/ws?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    const timer = setTimeout(() => {
      ws.terminate();
      resolve(false);
    }, 8000);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw)) as { type?: string; error?: string };
        if (msg.type === 'auth_ok') {
          ws.send(JSON.stringify({ type: 'subscribe_admin_ops' }));
        }
        if (msg.type === 'admin_ops_subscribed') {
          clearTimeout(timer);
          ws.close();
          resolve(true);
        }
        if (msg.type === 'error') {
          clearTimeout(timer);
          ws.close();
          resolve(false);
        }
      } catch {
        /* ignore */
      }
    });

    ws.on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function run() {
  console.log('MOVI Beta Cerrada QA —', API);
  console.log('SuperAdmin phone:', ADMIN_QA_PHONE, '\n');

  const token = await loginAsSuperAdmin();
  record('1. SuperAdmin login (+12144698637)', !!token);

  const me = await req('/admin/me', undefined, token);
  record(
    '2. GET /admin/me staffRole SUPER_ADMIN',
    me.status === 200 && me.json.data?.staffRole === 'SUPER_ADMIN',
    me.json.error
  );

  const endpoints: Array<[string, string]> = [
    ['3. GET /admin/drivers', '/admin/drivers'],
    ['4. GET /admin/passengers', '/admin/passengers'],
    ['5. GET /admin/ratings', '/admin/ratings'],
    ['6. GET /admin/operations-live/snapshot', '/admin/operations-live/snapshot'],
    ['7. GET /admin/support/tickets', '/admin/support/tickets'],
    ['8. GET /admin/finance/summary', '/admin/finance/summary'],
    ['9. GET /admin/security/summary', '/admin/security/summary'],
    ['10. GET /admin/audit', '/admin/audit'],
  ];

  for (const [label, path] of endpoints) {
    const res = await req(path, undefined, token);
    record(label, res.status === 200, res.json.error);
  }

  const wsOk = token ? await testAdminWebSocket(token) : false;
  record('11. WebSocket subscribe_admin_ops', wsOk);

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== BETA CERRADA QA ===\nPASS: ${pass} | FAIL: ${fail} | TOTAL: ${results.length}`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
