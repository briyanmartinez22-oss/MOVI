#!/usr/bin/env tsx
/**
 * QA — flujo verificaciones admin
 * Usage: npx tsx scripts/verification-qa-e2e.ts
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

async function req(path: string, body?: unknown, token?: string, method?: string) {
  const httpMethod = method ?? (body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${API}${path}`, {
    method: httpMethod,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function loginAs(phone: string, dui: string): Promise<string> {
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const login = await req('/auth/login', { phone, dui, code: OTP });
  if (!login.json.ok) throw new Error(`Login failed (${phone}): ${login.json.error}`);
  return login.json.data.authToken as string;
}

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

async function run() {
  console.log('MOVI Verificaciones QA —', API, '\n');

  const ts = Date.now();
  const ownerPhone = `73${String(ts).slice(-6)}`;
  await req('/auth/request-otp', { phone: ownerPhone });
  await req('/auth/verify-otp', { phone: ownerPhone, code: OTP });
  const regOwner = await req('/owners/register', {
    phone: ownerPhone,
    dui: '88888888-8',
    fullName: 'QA Verif Owner',
  });
  const ownerId = regOwner.json.data?.owner?.id as string;
  const ownerToken = regOwner.json.data?.authToken as string;
  record('1. Registro dueño', regOwner.json.ok === true, regOwner.json.error);

  const regVehicle = await req(
    '/vehicles/register',
    {
      unitNumber: '555',
      plateNumber: `V${String(ts).slice(-5)}`,
      associationName: 'QA Verif',
      vehicleType: 'mototaxi',
    },
    ownerToken
  );
  const vehicleId = regVehicle.json.data?.vehicleId as string;
  record('2. Registro vehículo', regVehicle.json.ok === true, regVehicle.json.error);

  await req(
    `/vehicles/${vehicleId}/upload-documents`,
    { registrationCardImage: 'https://example.com/reg.jpg' },
    ownerToken
  );
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, ownerToken);
  await req('/owners/upload-documents', { duiFront: 'https://example.com/dui.jpg' }, ownerToken);
  await req('/owners/submit-verification', {}, ownerToken);
  record('3. Subida documentos + envío a revisión', true);

  const adminToken = await loginAs('70801111', '00000000-0');
  const pendingBefore = await req('/admin/verifications/pending', undefined, adminToken);
  const ownersInPanel = (pendingBefore.json.data?.owners ?? []) as { id: string }[];
  const vehiclesInPanel = (pendingBefore.json.data?.vehicles ?? []) as { vehicleId: string }[];
  record(
    '4. Aparición en panel verificaciones',
    pendingBefore.json.ok &&
      ownersInPanel.some((o) => o.id === ownerId) &&
      vehiclesInPanel.some((v) => v.vehicleId === vehicleId)
  );

  await req(`/admin/owners/${ownerId}/approve`, {}, adminToken);
  await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);
  record('5. Admin aprueba dueño y vehículo', true);

  const invite = await req(`/vehicles/${vehicleId}/invite-driver`, {}, ownerToken);
  const inviteCode = invite.json.data?.code as string;
  const driverPhone = `74${String(ts).slice(-6)}`;
  await req('/auth/request-otp', { phone: driverPhone });
  await req('/auth/verify-otp', { phone: driverPhone, code: OTP });
  const regDriver = await req('/drivers/register-with-invite', {
    phone: driverPhone,
    dui: '99999999-9',
    fullName: 'QA Verif Driver',
    code: inviteCode,
  });
  const driverId = regDriver.json.data?.driver?.id as string;
  const driverToken = regDriver.json.data?.authToken as string;
  record(
    '6. Registro conductor',
    regDriver.json.ok && regDriver.json.data?.driver?.status === 'pending',
    regDriver.json.error
  );

  const pendingDriver = await req('/admin/verifications/pending', undefined, adminToken);
  const driversInPanel = (pendingDriver.json.data?.drivers ?? []) as { id: string; mvpStatus: string }[];
  record(
    '7. Conductor aparece en panel',
    pendingDriver.json.ok && driversInPanel.some((d) => d.id === driverId && d.mvpStatus === 'PENDING_REVIEW')
  );

  const approveDriver = await req(`/admin/drivers/${driverId}/approve`, {}, adminToken);
  record('8. Admin aprueba conductor', approveDriver.json.ok === true, approveDriver.json.error);

  const session = await req(`/drivers/${driverId}/sessions/start`, { vehicleId }, driverToken);
  record('9. Conductor habilitado (puede conectarse)', session.json.ok === true, session.json.error);

  const pendingAfter = await req('/admin/verifications/pending', undefined, adminToken);
  const driverGone = !(pendingAfter.json.data?.drivers ?? []).some((d: { id: string }) => d.id === driverId);
  record('10. Panel refleja aprobación (conductor fuera de cola)', driverGone);

  console.log('\n=== RESUMEN VERIFICACIONES QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) {
    console.log('\nFallos:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(` - ${r.step}: ${r.detail ?? ''}`));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
