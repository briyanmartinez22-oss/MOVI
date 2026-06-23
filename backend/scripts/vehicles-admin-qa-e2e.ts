#!/usr/bin/env tsx
/**
 * QA — Admin vehicle review flow
 * Usage: npm run qa:vehicles-admin
 */
import { loginAsSuperAdmin, req, OTP } from './admin-qa-auth';
import { ownerRegisterPayload, QA_PASSWORD } from './qa-registration';

const API = process.env.API_URL ?? 'http://localhost:3001';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Vehicle Admin QA —', API, '\n');

  const adminToken = await loginAsSuperAdmin();
  record('SuperAdmin login', Boolean(adminToken));

  const listBefore = await req('/admin/vehicles', undefined, adminToken);
  record('GET /admin/vehicles', listBefore.status === 200 && Array.isArray(listBefore.json.data?.vehicles));

  const ownerPhone = `81${String(Date.now()).slice(-6)}`;
  await req('/auth/request-otp', { phone: ownerPhone });
  await req('/auth/verify-otp', { phone: ownerPhone, code: OTP });
  const ownerDui = `${String(Date.now()).slice(-8)}-1`;
  const regOwner = await req(
    '/owners/register',
    ownerRegisterPayload(ownerPhone, ownerDui, 'QA', 'Vehicle Owner')
  );
  const ownerToken = regOwner.json.data?.authToken as string;
  record('Owner registrado', regOwner.json.ok === true, regOwner.json.error);

  const plate = `V${String(Date.now()).slice(-5)}`;
  const regVehicle = await req(
    '/vehicles/register',
    {
      unitNumber: '501',
      plateNumber: plate,
      associationName: 'QA Vehicle Admin',
      vehicleType: 'mototaxi',
      registrationName: 'Nombre Diferente QA',
    },
    ownerToken
  );
  const vehicleId = regVehicle.json.data?.vehicleId as string;
  record('Registro vehículo (draft)', regVehicle.json.ok === true);

  await req(
    `/vehicles/${vehicleId}/upload-documents`,
    { registrationCardImage: 'https://example.com/reg.jpg' },
    ownerToken
  );

  const submit = await req(`/vehicles/${vehicleId}/submit-verification`, {}, ownerToken);
  record(
    'Submit con nombre distinto → incomplete (no rejected)',
    submit.json.ok === false,
    submit.json.error
  );

  const detailAfterSubmit = await req(`/admin/vehicles/${vehicleId}`, undefined, adminToken);
  const statusAfter = detailAfterSubmit.json.data?.status;
  record(
    'Estado incomplete/under_review tras submit',
    statusAfter === 'incomplete' || statusAfter === 'under_review',
    String(statusAfter)
  );

  await req(`/admin/vehicles/${vehicleId}`, undefined, adminToken);
  const approve = await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);
  record('SUPER_ADMIN aprueba vehículo', approve.json.ok === true, approve.json.error);

  const ownerPhone2 = `82${String(Date.now()).slice(-6)}`;
  await req('/auth/request-otp', { phone: ownerPhone2 });
  await req('/auth/verify-otp', { phone: ownerPhone2, code: OTP });
  const regOwner2 = await req(
    '/owners/register',
    ownerRegisterPayload(ownerPhone2, `${String(Date.now()).slice(-8)}-2`, 'QA', 'Reject Owner')
  );
  const ownerToken2 = regOwner2.json.data?.authToken as string;
  const plate2 = `R${String(Date.now()).slice(-5)}`;
  const regV2 = await req(
    '/vehicles/register',
    {
      unitNumber: '502',
      plateNumber: plate2,
      associationName: 'QA Reject',
      vehicleType: 'mototaxi',
    },
    ownerToken2
  );
  const vehicleId2 = regV2.json.data?.vehicleId as string;
  await req(
    `/vehicles/${vehicleId2}/upload-documents`,
    { registrationCardImage: 'https://example.com/reg2.jpg' },
    ownerToken2
  );
  await req(`/vehicles/${vehicleId2}/submit-verification`, {}, ownerToken2);

  const reject = await req(
    `/admin/vehicles/${vehicleId2}/reject`,
    { reason: 'Documentación QA inválida' },
    adminToken
  );
  record('SUPER_ADMIN rechaza con motivo', reject.json.ok === true, reject.json.error);

  const suspend = await req(`/admin/vehicles/${vehicleId}/suspend`, {}, adminToken);
  record('SUPER_ADMIN suspende vehículo', suspend.json.ok === true);

  const reactivate = await req(`/admin/vehicles/${vehicleId}/reactivate`, {}, adminToken);
  record('SUPER_ADMIN reactiva vehículo', reactivate.json.ok === true);

  const audit = await req('/admin/audit?limit=20', undefined, adminToken);
  const logs = audit.json.data?.logs ?? audit.json.logs ?? [];
  record(
    'Auditoría registra acciones vehicle',
    Array.isArray(logs) && logs.some((l: { entityType?: string }) => l.entityType === 'vehicle')
  );

  const pending = await req('/admin/verifications/pending', undefined, adminToken);
  record('Dashboard pending verifications responde', pending.status === 200);

  console.log('\n=== RESUMEN VEHICLE ADMIN QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
