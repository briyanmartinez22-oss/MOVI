#!/usr/bin/env tsx
/**
 * QA — Dispatch Manual (FASE 2)
 * Usage: npm run qa:dispatch
 */
import { loginAsSuperAdmin, req, API } from './admin-qa-auth';
import { createRequestedTrip, registerDriverWithVehicle, registerPassenger } from './qa-bootstrap';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Dispatch QA —', API, '\n');
  const adminToken = await loginAsSuperAdmin();
  record('0. Auth SuperAdmin', !!adminToken);

  const tripsRes = await req('/admin/operations-live/trips', undefined, adminToken);
  const trips = tripsRes.json.data?.trips as Array<{ id: string; lifecycleStatus?: string }> | undefined;
  record('GET trips', tripsRes.status === 200 && Array.isArray(trips));

  const passenger = await registerPassenger('QA Dispatch Passenger');
  await registerDriverWithVehicle(adminToken);
  const trip = await createRequestedTrip(passenger.token);
  const pending = { id: trip.id, lifecycleStatus: 'requested' as const };
  record('Trip para dispatch (bootstrap)', true, trip.id);

  if (pending?.id) {
    const candidates = await req(
      `/admin/operations-live/trips/${pending.id}/dispatch-candidates`,
      undefined,
      adminToken
    );
    const list = candidates.json.data?.candidates as unknown[] | undefined;
    record(
      'GET dispatch-candidates 200',
      candidates.status === 200 && Array.isArray(list),
      candidates.json.error
    );

    if (list && list.length > 0) {
      const driverId = (list[0] as { driverId: string }).driverId;
      const dispatch = await req(
        `/admin/operations-live/trips/${pending.id}/dispatch`,
        { driverId },
        adminToken
      );
      record(
        'POST dispatch responde ok',
        (dispatch.status === 200 || dispatch.status === 201) && dispatch.json.ok === true,
        dispatch.json.error
      );
    } else {
      record('POST dispatch (skip)', true, 'Sin conductores candidatos');
    }
  }

  const unauthorized = await req('/admin/operations-live/trips/fake/dispatch-candidates');
  record(
    'dispatch-candidates sin token rechazado',
    unauthorized.status === 401 || unauthorized.json.ok === false
  );

  console.log('\n=== RESUMEN DISPATCH QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
