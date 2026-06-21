#!/usr/bin/env tsx
/**
 * QA — Google Maps integration
 * Usage: npm run qa:maps
 */
const API = process.env.API_URL ?? 'http://localhost:3001';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Maps QA —', API, '\n');

  const statusRes = await fetch(`${API}/integrations/status`);
  const statusJson = await statusRes.json();
  const maps = statusJson.data?.maps ?? statusJson.maps;
  record('GET /integrations/status maps', statusRes.ok && Boolean(maps), maps?.active ? 'active' : maps?.mode);

  const testRes = await fetch(`${API}/integrations/maps/test`);
  const testJson = await testRes.json();
  const data = testJson.data ?? testJson;
  record('GET /integrations/maps/test', testRes.ok && data?.configured !== false, data?.error ?? data?.provider);

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== MAPS QA ===\nPASS: ${pass} | FAIL: ${fail}`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
