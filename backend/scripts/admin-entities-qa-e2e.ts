#!/usr/bin/env tsx
/**
 * QA — Acciones reales admin: passengers, drivers, owners, businesses + auditoría
 * Usage: npm run qa:admin-entities
 */
import { loginAsSuperAdmin, req } from './admin-qa-auth';
import { ensureQaFixtures } from './qa-bootstrap';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Admin Entities QA\n');
  const token = await loginAsSuperAdmin();
  record('1. SuperAdmin login', !!token);

  let passengers = await req('/admin/passengers', undefined, token);
  let passengerList = passengers.json.data?.passengers ?? [];
  let drivers = await req('/admin/drivers', undefined, token);
  let driverList = drivers.json.data?.drivers ?? [];
  let owners = await req('/admin/owners', undefined, token);
  let ownerList = owners.json.data?.owners ?? [];
  let businesses = await req('/admin/businesses', undefined, token);
  let businessList = businesses.json.data?.businesses ?? [];

  if (!passengerList.length || !driverList.length || !ownerList.length || !businessList.length) {
    await ensureQaFixtures(token);
    passengers = await req('/admin/passengers', undefined, token);
    passengerList = passengers.json.data?.passengers ?? [];
    drivers = await req('/admin/drivers', undefined, token);
    driverList = drivers.json.data?.drivers ?? [];
    owners = await req('/admin/owners', undefined, token);
    ownerList = owners.json.data?.owners ?? [];
    businesses = await req('/admin/businesses', undefined, token);
    businessList = businesses.json.data?.businesses ?? [];
  }

  record('2. GET /admin/passengers', passengers.status === 200, passengers.json.error);
  record('3. GET /admin/drivers', drivers.status === 200, drivers.json.error);
  record('4. GET /admin/owners', owners.status === 200, owners.json.error);
  record('5. GET /admin/businesses', businesses.status === 200, businesses.json.error);

  const passenger = passengerList[0];
  if (passenger?.id) {
    const detail = await req(`/admin/passengers/${passenger.id}`, undefined, token);
    record('6. GET /admin/passengers/:id', detail.status === 200, detail.json.error);

    const suspend = await req(`/admin/passengers/${passenger.id}/suspend`, {}, token);
    record('7. POST /admin/passengers/:id/suspend', suspend.status === 201 || suspend.status === 200, suspend.json.error);

    const reactivate = await req(`/admin/passengers/${passenger.id}/reactivate`, {}, token);
    record('8. POST /admin/passengers/:id/reactivate', reactivate.status === 201 || reactivate.status === 200, reactivate.json.error);
  } else {
    record('6. Passenger detail/actions', false, 'Sin pasajeros en BD');
  }

  const pendingDriver = driverList.find((d: { mvpStatus?: string }) => d.mvpStatus !== 'VERIFIED');
  const driver = pendingDriver ?? driverList[0];
  if (driver?.id) {
    if (driver.mvpStatus !== 'VERIFIED' && driver.mvpStatus !== 'SUSPENDED') {
      const approve = await req(`/admin/drivers/${driver.id}/approve`, {}, token);
      record('9. POST /admin/drivers/:id/approve', approve.status === 201 || approve.status === 200, approve.json.error);
    } else {
      record('9. POST /admin/drivers/:id/approve', true, 'Omitido — conductor ya verificado');
    }

    const suspendDriver = await req(`/admin/drivers/${driver.id}/suspend`, {}, token);
    record('10. POST /admin/drivers/:id/suspend', suspendDriver.status === 201 || suspendDriver.status === 200, suspendDriver.json.error);

    const reactivateDriver = await req(`/admin/drivers/${driver.id}/reactivate`, {}, token);
    record('11. POST /admin/drivers/:id/reactivate', reactivateDriver.status === 201 || reactivateDriver.status === 200, reactivateDriver.json.error);
  } else {
    record('9. Driver actions', false, 'Sin conductores en BD');
  }

  const owner = ownerList[0];
  if (owner?.id) {
    if (owner.mvpStatus !== 'VERIFIED' && owner.mvpStatus !== 'SUSPENDED') {
      const approveOwner = await req(`/admin/owners/${owner.id}/approve`, {}, token);
      record('12. POST /admin/owners/:id/approve', approveOwner.status === 201 || approveOwner.status === 200, approveOwner.json.error);
    } else {
      record('12. POST /admin/owners/:id/approve', true, 'Omitido — owner ya verificado');
    }

    const suspendOwner = await req(`/admin/owners/${owner.id}/suspend`, {}, token);
    record('13. POST /admin/owners/:id/suspend', suspendOwner.status === 201 || suspendOwner.status === 200, suspendOwner.json.error);

    const reactivateOwner = await req(`/admin/owners/${owner.id}/reactivate`, {}, token);
    record('14. POST /admin/owners/:id/reactivate', reactivateOwner.status === 201 || reactivateOwner.status === 200, reactivateOwner.json.error);
  } else {
    record('12. Owner actions', false, 'Sin owners en BD');
  }

  const business = businessList[0];
  if (business?.id) {
    const status = business.mvpStatus ?? business.status;
    if (status !== 'VERIFIED' && status !== 'approved' && status !== 'SUSPENDED') {
      const approveBiz = await req(`/admin/businesses/${business.id}/approve`, {}, token);
      record('15. POST /admin/businesses/:id/approve', approveBiz.status === 201 || approveBiz.status === 200, approveBiz.json.error);
    } else {
      record('15. POST /admin/businesses/:id/approve', true, 'Omitido — comercio ya aprobado');
    }

    const suspendBiz = await req(`/admin/businesses/${business.id}/suspend`, {}, token);
    record('16. POST /admin/businesses/:id/suspend', suspendBiz.status === 201 || suspendBiz.status === 200, suspendBiz.json.error);

    const reactivateBiz = await req(`/admin/businesses/${business.id}/reactivate`, {}, token);
    record('17. POST /admin/businesses/:id/reactivate', reactivateBiz.status === 201 || reactivateBiz.status === 200, reactivateBiz.json.error);
  } else {
    record('15. Business actions', false, 'Sin comercios en BD');
  }

  const audit = await req('/admin/audit?limit=5', undefined, token);
  const auditRows = audit.json.data?.logs ?? audit.json.data ?? [];
  const hasRecentAudit = Array.isArray(auditRows) && auditRows.length > 0;
  record('18. Auditoría registrada (GET /admin/audit)', audit.status === 200 && hasRecentAudit, hasRecentAudit ? undefined : 'Sin registros recientes');

  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== ADMIN ENTITIES QA ===\nPASS: ${pass} | FAIL: ${fail} | TOTAL: ${results.length}`);
  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});
