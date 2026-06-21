#!/usr/bin/env tsx
/**
 * QA — Operations Live Center (/admin/operations-live)
 * Usage: npm run qa:operations-live
 */
import { loginAsSuperAdmin, req, API } from './admin-qa-auth';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

const OPS_ENDPOINTS = [
  '/admin/operations-live/snapshot',
  '/admin/operations-live/drivers',
  '/admin/operations-live/trips',
  '/admin/operations-live/alerts',
] as const;

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

async function run() {
  console.log('MOVI Operations Live QA —', API, '\n');

  const adminToken = await loginAsSuperAdmin();
  record('0. Auth SuperAdmin', !!adminToken);

  for (const path of OPS_ENDPOINTS) {
    const res = await req(path, undefined, adminToken);
    record(
      `GET ${path} responde 200`,
      res.status === 200 && res.json.ok === true,
      res.json.error ?? `status=${res.status}`
    );
  }

  const snapshot = (await req('/admin/operations-live/snapshot', undefined, adminToken)).json
    .data as Record<string, unknown>;

  const kpiFields: [string, unknown][] = [
    ['driversOnline', snapshot?.driversOnline],
    ['driversBusy', snapshot?.driversBusy],
    ['activeTrips', snapshot?.activeTrips],
    ['pendingTrips', snapshot?.pendingTrips],
    ['avgWaitMinutes', snapshot?.avgWaitMinutes],
  ];

  record(
    'KPIs snapshot son números',
    kpiFields.every(([, v]) => isNumber(v)),
    kpiFields.find(([, v]) => !isNumber(v))?.[0] ?? undefined
  );

  const driversRes = await req('/admin/operations-live/drivers', undefined, adminToken);
  const drivers = driversRes.json.data?.drivers as unknown[];
  record('Drivers retorna array', Array.isArray(drivers));

  const tripsRes = await req('/admin/operations-live/trips', undefined, adminToken);
  const trips = tripsRes.json.data?.trips as unknown[] | undefined;
  record('Trips retorna array', Array.isArray(trips));

  const alertsRes = await req('/admin/operations-live/alerts', undefined, adminToken);
  const alerts = alertsRes.json.data?.alerts as unknown[] | undefined;
  record('Alerts retorna array', Array.isArray(alerts));

  const unauthorized = await req('/admin/operations-live/snapshot');
  record(
    'Snapshot sin token rechazado',
    unauthorized.status === 401 || unauthorized.json.ok === false
  );

  if (trips && trips.length > 0) {
    const trip = trips[0] as { id?: string };
    if (trip?.id) {
      const detail = await req(`/admin/operations-live/trips/${trip.id}`, undefined, adminToken);
      record(
        'GET trip detail responde 200',
        detail.status === 200 && detail.json.ok === true
      );

      const available = await req(
        `/admin/operations-live/trips/${trip.id}/available-drivers`,
        undefined,
        adminToken
      );
      record(
        'GET available-drivers responde 200',
        available.status === 200 && available.json.ok === true
      );
    }
  }

  console.log('\n=== RESUMEN OPERATIONS LIVE QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) {
    console.log('\nFallos:');
    results
      .filter((r) => r.status === 'FAIL')
      .forEach((r) => console.log(` - ${r.step}: ${r.detail ?? ''}`));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
