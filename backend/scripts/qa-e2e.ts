#!/usr/bin/env tsx
/**
 * MOVI QA E2E smoke test — run against local backend on :3001
 * Usage: npx tsx scripts/qa-e2e.ts
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

const PASSENGER_PHONE = '78214898';
const PASSENGER_DUI = '71542253-8';
const DRIVER_PHONE = '78981234';
const DRIVER_DUI = '12345678-9';
const ADMIN_PHONE = '70801111';
const ADMIN_DUI = '00000000-0';

async function req(path: string, body?: unknown, token?: string, method = body ? 'POST' : 'GET') {
  const res = await fetch(`${API}${path}`, {
    method,
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

async function run() {
  console.log('MOVI QA E2E —', API);

  const health = await req('/health');
  if (health.json.status !== 'ok') throw new Error('Health check failed');
  console.log('✓ health');

  const otpReq = await req('/auth/request-otp', { phone: PASSENGER_PHONE });
  if (!otpReq.json.ok) throw new Error('OTP request failed');
  console.log('✓ request-otp');

  const otpVerify = await req('/auth/verify-otp', { phone: PASSENGER_PHONE, code: OTP });
  if (!otpVerify.json.ok) throw new Error('OTP verify failed');
  console.log('✓ verify-otp');

  const passengerToken = await loginAs(PASSENGER_PHONE, PASSENGER_DUI);
  console.log('✓ login pasajero');

  const me = await fetch(`${API}/auth/me`, {
    headers: { Authorization: `Bearer ${passengerToken}` },
  }).then((r) => r.json());
  if (!me.ok) throw new Error('GET /auth/me failed');
  console.log('✓ auth/me');

  const profiles = await fetch(`${API}/users/me/profiles`, {
    headers: { Authorization: `Bearer ${passengerToken}` },
  }).then((r) => r.json());
  if (!profiles.ok) throw new Error('GET /users/me/profiles failed');
  console.log('✓ profiles');

  const tripReq = await req(
    '/trips/request',
    {
      origin: {
        id: 'origin',
        name: 'Metrocentro',
        coordinates: { latitude: 13.6992, longitude: -89.2244 },
      },
      destination: {
        id: 'destination',
        name: 'Centro Histórico',
        coordinates: { latitude: 13.6929, longitude: -89.2182 },
      },
      tripType: 'shared',
      kind: 'ride',
      passengerCount: 1,
      description: 'QA trip',
      passengerName: 'Juan Pasajero',
    },
    passengerToken
  );
  if (!tripReq.json.ok) throw new Error('Trip request failed: ' + tripReq.json.error);
  const tripId = tripReq.json.data.id as string;
  console.log('✓ crear solicitud', tripId);

  const driverToken = await loginAs(DRIVER_PHONE, DRIVER_DUI);
  console.log('✓ login conductor');

  const offer = await req(
    `/trips/${tripId}/offers`,
    { price: 2.5, etaMinutes: 8 },
    driverToken
  );
  if (!offer.json.ok) throw new Error('Offer failed: ' + offer.json.error);
  const offerId = offer.json.data.offer.id as string;
  console.log('✓ conductor envía oferta', offerId);

  const accept = await req(`/trips/${tripId}/offers/${offerId}/accept`, {}, passengerToken);
  if (!accept.json.ok) throw new Error('Accept offer failed: ' + accept.json.error);
  console.log('✓ pasajero acepta oferta');

  const chat = await req(`/trips/${tripId}/chat`, undefined, passengerToken);
  if (!chat.json.ok) throw new Error('Chat history failed');
  console.log('✓ chat endpoint');

  const history = await req('/trips/history', undefined, passengerToken);
  if (!history.json.ok) throw new Error('Trip history failed');
  console.log('✓ historial');

  const adminToken = await loginAs(ADMIN_PHONE, ADMIN_DUI);
  const kpis = await req('/admin/kpis', undefined, adminToken);
  if (!kpis.json.ok) throw new Error('Admin KPIs failed');
  console.log('✓ admin KPIs');

  const zones = await req('/demand-zones');
  if (!zones.json.ok) throw new Error('demand-zones failed');
  console.log('✓ demand-zones');

  console.log('\n✅ QA E2E passed');
}

run().catch((e) => {
  console.error('❌ QA failed:', e.message);
  process.exit(1);
});
