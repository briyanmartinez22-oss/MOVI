#!/usr/bin/env tsx
/**
 * MOVI MVP QA — 10-step end-to-end validation
 * Usage: npx tsx scripts/mvp-qa-e2e.ts
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

type StepResult = { step: string; status: 'PASS' | 'FAIL' | 'SKIP'; detail?: string };

const results: StepResult[] = [];

async function req(
  path: string,
  body?: unknown,
  token?: string,
  method?: string
) {
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
  console.log('MOVI MVP QA —', API, '\n');

  // 0. Health
  const health = await req('/health');
  record('0. Health check', health.json.status === 'ok');

  // 1. Registro pasajero (nuevo teléfono)
  const newPassengerPhone = `70${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: newPassengerPhone });
  await req('/auth/verify-otp', { phone: newPassengerPhone, code: OTP });
  const regPass = await req('/passengers/register', {
    phone: newPassengerPhone,
    fullName: 'QA Pasajero MVP',
  });
  record('1. Registro pasajero', regPass.json.ok === true, regPass.json.error);

  // 2. Registro proveedor (owner + vehicle + driver pending)
  const newOwnerPhone = `71${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: newOwnerPhone });
  await req('/auth/verify-otp', { phone: newOwnerPhone, code: OTP });
  const regOwner = await req('/owners/register', {
    phone: newOwnerPhone,
    dui: '22222222-2',
    fullName: 'QA Dueño MVP',
  });
  const ownerId = regOwner.json.data?.owner?.id as string;
  record('2. Registro proveedor (dueño)', regOwner.json.ok === true, regOwner.json.error);

  const ownerToken = regOwner.json.data?.authToken as string;
  const regVehicle = await req(
    '/vehicles/register',
    {
      unitNumber: '999',
      plateNumber: `Q${Date.now().toString().slice(-5)}`,
      associationName: 'QA Asoc',
      vehicleType: 'mototaxi',
    },
    ownerToken
  );
  const vehicleId = regVehicle.json.data?.vehicleId as string;
  record('2b. Registro vehículo', regVehicle.json.ok === true, regVehicle.json.error);

  await req(`/vehicles/${vehicleId}/upload-documents`, { registrationCardImage: 'https://example.com/doc.jpg' }, ownerToken);
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, ownerToken);
  await req('/owners/upload-documents', { duiFront: 'https://example.com/dui.jpg' }, ownerToken);
  await req('/owners/submit-verification', {}, ownerToken);

  const adminToken = await loginAs('70801111', '00000000-0');
  const approveOwnerPre = await req(`/admin/owners/${ownerId}/approve`, {}, adminToken);
  const approveVehiclePre = await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);
  record('2a. Aprobación dueño/vehículo (pre-invitación)', approveOwnerPre.json.ok && approveVehiclePre.json.ok);

  const invite = await req(`/vehicles/${vehicleId}/invite-driver`, {}, ownerToken);
  const inviteCode = invite.json.data?.code as string;

  const newDriverPhone = `72${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: newDriverPhone });
  await req('/auth/verify-otp', { phone: newDriverPhone, code: OTP });
  const regDriver = await req('/drivers/register-with-invite', {
    phone: newDriverPhone,
    dui: '33333333-3',
    fullName: 'QA Conductor MVP',
    code: inviteCode,
  });
  const driverId = regDriver.json.data?.driver?.id as string;
  const driverStatus = regDriver.json.data?.driver?.status;
  record('2c. Registro conductor (pending)', regDriver.json.ok && driverStatus === 'pending', regDriver.json.error ?? `status=${driverStatus}`);

  // 3. Aprobación proveedor (admin)
  const approveDriver = await req(`/admin/drivers/${driverId}/approve`, {}, adminToken);
  record(
    '3. Aprobación proveedor (conductor)',
    approveDriver.json.ok === true,
    approveDriver.json.error
  );

  // 4. Proveedor online
  const driverToken = regDriver.json.data?.authToken as string;
  const session = await req(
    `/drivers/${driverId}/sessions/start`,
    {
      vehicleId,
      latitude: 13.6992,
      longitude: -89.2244,
    },
    driverToken
  );
  record('4. Proveedor online (sesión)', session.json.ok === true, session.json.error);

  // 5. Solicitud servicio
  const passengerToken = await loginAs('78214898', '71542253-8');
  const tripReq = await req(
    '/trips/request',
    {
      origin: { id: 'o', name: 'Metrocentro', coordinates: { latitude: 13.6992, longitude: -89.2244 } },
      destination: { id: 'd', name: 'Centro', coordinates: { latitude: 13.6929, longitude: -89.2182 } },
      tripType: 'shared',
      kind: 'ride',
      passengerCount: 1,
      description: 'MVP QA trip',
      passengerName: 'Juan Pasajero',
      requiredVehicleType: 'mototaxi',
      requestMode: 'NOW',
    },
    passengerToken
  );
  const tripId = tripReq.json.data?.id as string;
  record('5. Solicitud servicio', tripReq.json.ok === true, tripReq.json.error);

  const available = await req('/trips/available', undefined, driverToken);
  const tripList = available.json.data?.trips ?? [];
  const received = available.json.ok && tripList.some((t: { id: string }) => t.id === tripId);
  record('5b. Proveedor recibe solicitud', received, available.json.error);

  // 6. Oferta real
  const offer = await req(`/trips/${tripId}/offers`, { price: 3.0, etaMinutes: 7 }, driverToken);
  const offerId = offer.json.data?.offer?.id as string;
  record('6. Oferta real PostgreSQL', offer.json.ok === true && !!offerId, offer.json.error);

  // 7. Aceptación
  const accept = await req(`/trips/${tripId}/offers/${offerId}/accept`, {}, passengerToken);
  record('7. Aceptación oferta', accept.json.ok === true, accept.json.error);

  // 8. Chat
  const chatSend = await req(
    `/trips/${tripId}/chat`,
    undefined,
    passengerToken,
    'GET'
  );
  const chatOk = chatSend.json.ok === true;
  record('8. Chat (historial)', chatOk);

  // Advance lifecycle to completed
  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'driver_arriving' }, driverToken, 'PATCH');
  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'driver_arrived' }, driverToken, 'PATCH');
  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'trip_started' }, driverToken, 'PATCH');
  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'trip_completed' }, driverToken, 'PATCH');

  // 9. Completar servicio
  const tripFinal = await req(`/trips/${tripId}`, undefined, passengerToken);
  record('9. Completar servicio', tripFinal.json.data?.lifecycleStatus === 'trip_completed');

  // 10. Calificación
  const ratePass = await req(
    `/trips/${tripId}/ratings`,
    { stars: 5, comment: 'Excelente', raterRole: 'passenger' },
    passengerToken
  );
  const rateDriver = await req(
    `/trips/${tripId}/ratings`,
    { stars: 4, comment: 'Buen pasajero', raterRole: 'driver' },
    driverToken
  );
  record('10. Calificación bidireccional', ratePass.json.ok && rateDriver.json.ok, ratePass.json.error);

  // Admin panel checks
  const providers = await req('/admin/providers', undefined, adminToken);
  const trips = await req('/admin/trips', undefined, adminToken);
  const requests = await req('/admin/requests', undefined, adminToken);
  record('Admin: listar proveedores', providers.json.ok && Array.isArray(providers.json.data?.providers));
  record('Admin: ver viajes', trips.json.ok && Array.isArray(trips.json.data?.trips));
  record('Admin: ver solicitudes', requests.json.ok && Array.isArray(requests.json.data?.requests));

  // Subscription structure
  const sub = await req('/subscriptions/me', undefined, driverToken);
  const subData = sub.json.data?.subscription;
  const subStatus = subData?.subscriptionStatus ?? subData?.status;
  record('Suscripción MVP estructura', !!subData && subData.monthlyFee === 7, `status=${subStatus}`);

  console.log('\n=== RESUMEN MVP QA ===');
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
