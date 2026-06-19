#!/usr/bin/env tsx
/**
 * QA — trip ratings (bidirectional + validation)
 * Usage: npm run qa:ratings
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
  console.log('MOVI Ratings QA —', API, '\n');

  const adminToken = await loginAs('70801111', '00000000-0');
  const ownerPhone = `71${String(Date.now() + 1).slice(-6)}`;
  await req('/auth/request-otp', { phone: ownerPhone });
  await req('/auth/verify-otp', { phone: ownerPhone, code: OTP });
  const ownerReg = await req('/owners/register', {
    phone: ownerPhone,
    dui: '55555555-5',
    fullName: 'QA Ratings Owner',
  });
  const ownerToken = ownerReg.json.data?.authToken as string;
  const ownerId = ownerReg.json.data?.owner?.id as string;

  const vehicleReg = await req(
    '/vehicles/register',
    {
      unitNumber: '777',
      plateNumber: `R${Date.now().toString().slice(-5)}`,
      associationName: 'QA',
      vehicleType: 'mototaxi',
    },
    ownerToken
  );
  const vehicleId = vehicleReg.json.data?.vehicleId as string;
  await req(`/vehicles/${vehicleId}/upload-documents`, { registrationCardImage: 'https://example.com/doc.jpg' }, ownerToken);
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, ownerToken);
  await req('/owners/upload-documents', { duiFront: 'https://example.com/dui.jpg' }, ownerToken);
  await req('/owners/submit-verification', {}, ownerToken);
  await req(`/admin/owners/${ownerId}/approve`, {}, adminToken);
  await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);

  const invite = await req(`/vehicles/${vehicleId}/invite-driver`, {}, ownerToken);
  const inviteCode = invite.json.data?.code as string;
  const driverPhone = `72${String(Date.now() + 2).slice(-6)}`;
  await req('/auth/request-otp', { phone: driverPhone });
  await req('/auth/verify-otp', { phone: driverPhone, code: OTP });
  const driverReg = await req('/drivers/register-with-invite', {
    phone: driverPhone,
    dui: '66666666-6',
    fullName: 'QA Ratings Driver',
    code: inviteCode,
  });
  const driverId = driverReg.json.data?.driver?.id as string;
  const driverToken = driverReg.json.data?.authToken as string;
  await req(`/admin/drivers/${driverId}/approve`, {}, adminToken);
  await req(
    `/drivers/${driverId}/sessions/start`,
    { vehicleId, latitude: 13.6992, longitude: -89.2244 },
    driverToken
  );

  const passengerToken = await loginAs('78214898', '71542253-8');
  const tripReq = await req(
    '/trips/request',
    {
      origin: { id: 'o', name: 'Metrocentro', coordinates: { latitude: 13.6992, longitude: -89.2244 } },
      destination: { id: 'd', name: 'Centro', coordinates: { latitude: 13.6929, longitude: -89.2182 } },
      tripType: 'shared',
      description: 'Ratings QA trip',
      requiredVehicleType: 'mototaxi',
      requestMode: 'NOW',
    },
    passengerToken
  );
  const tripId = tripReq.json.data?.id as string;
  record('Viaje creado para ratings', tripReq.json.ok === true, tripReq.json.error);

  const offer = await req(`/trips/${tripId}/offers`, { price: 4, etaMinutes: 8 }, driverToken);
  const offerId = offer.json.data?.offer?.id as string;
  await req(`/trips/${tripId}/offers/${offerId}/accept`, {}, passengerToken);
  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'driver_arriving' }, driverToken, 'PATCH');
  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'driver_arrived' }, driverToken, 'PATCH');
  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'trip_started' }, driverToken, 'PATCH');

  const beforeComplete = await req(
    `/trips/${tripId}/ratings`,
    { stars: 5, raterRole: 'passenger' },
    passengerToken
  );
  record(
    'Rechaza rating antes de completar viaje',
    beforeComplete.json.ok === false,
    beforeComplete.json.error
  );

  await req(`/trips/${tripId}/lifecycle`, { lifecycleStatus: 'trip_completed' }, driverToken, 'PATCH');

  const tripFinal = await req(`/trips/${tripId}`, undefined, passengerToken);
  record('Viaje completado', tripFinal.json.data?.lifecycleStatus === 'trip_completed');

  const invalidStars = await req(
    `/trips/${tripId}/ratings`,
    { stars: 6, raterRole: 'passenger' },
    passengerToken
  );
  record('Rechaza estrellas inválidas', invalidStars.json.ok === false, invalidStars.json.error);

  const ratePass = await req(
    `/trips/${tripId}/ratings`,
    { stars: 5, comment: 'Excelente', raterRole: 'passenger' },
    passengerToken
  );
  record('Pasajero califica conductor', ratePass.json.ok === true, ratePass.json.error);

  const rateDriver = await req(
    `/trips/${tripId}/ratings`,
    { stars: 4, comment: 'Buen pasajero', raterRole: 'driver' },
    driverToken
  );
  record('Conductor califica pasajero', rateDriver.json.ok === true, rateDriver.json.error);

  const duplicate = await req(
    `/trips/${tripId}/ratings`,
    { stars: 3, raterRole: 'passenger' },
    passengerToken
  );
  record('Rechaza calificación duplicada', duplicate.json.ok === false, duplicate.json.error);

  const list = await req(`/trips/${tripId}/ratings`, undefined, passengerToken);
  const ratings = list.json.data?.ratings ?? [];
  record(
    'Listado devuelve 2 calificaciones',
    list.json.ok === true && ratings.length === 2,
    `count=${ratings.length}`
  );

  console.log('\n=== RESUMEN RATINGS QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) process.exit(1);
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
