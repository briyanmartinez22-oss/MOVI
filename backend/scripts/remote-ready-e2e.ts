#!/usr/bin/env tsx
/**
 * MOVI Remote Readiness QA — run against public backend URL
 *
 * Usage:
 *   API_URL=https://your-app.up.railway.app WS_URL=wss://your-app.up.railway.app/ws npx tsx scripts/remote-ready-e2e.ts
 */
import WebSocket from 'ws';

const API = process.env.API_URL ?? 'http://localhost:3001';
const WS = process.env.WS_URL ?? API.replace(/^https/, 'wss').replace(/^http/, 'ws') + '/ws';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

type Status = 'OK' | 'FAIL' | 'PARTIAL';

interface Result {
  name: string;
  status: Status;
  evidence: string;
}

const results: Result[] = [];

function log(name: string, status: Status, evidence: string) {
  results.push({ name, status, evidence });
  const icon = { OK: '✅', FAIL: '❌', PARTIAL: '⚠️' }[status];
  console.log(`${icon} ${name}: ${evidence}`);
}

async function req(
  path: string,
  body?: unknown,
  token?: string,
  method?: string
): Promise<{ status: number; json: Record<string, unknown> }> {
  const m = method ?? (body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${API}${path}`, {
    method: m,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json: Record<string, unknown> = {};
  try {
    json = (await res.json()) as Record<string, unknown>;
  } catch {
    json = {};
  }
  return { status: res.status, json };
}

async function login(phone: string, dui: string): Promise<string> {
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const res = await req('/auth/login', { phone, dui, code: OTP });
  if (!res.json.ok) throw new Error(String(res.json.error ?? 'login failed'));
  return (res.json.data as { authToken: string }).authToken;
}

async function run() {
  console.log('═'.repeat(60));
  console.log('MOVI REMOTE READINESS QA');
  console.log('API:', API);
  console.log('WS:', WS);
  console.log('═'.repeat(60));

  const health = await req('/health');
  const healthBody = health.json as { status?: string; database?: string };
  if (health.status === 200 && healthBody.status === 'ok' && healthBody.database === 'connected') {
    log('GET /health', 'OK', `status=${healthBody.status}, database=${healthBody.database}`);
  } else if (health.status === 200) {
    log('GET /health', 'PARTIAL', JSON.stringify(healthBody));
  } else {
    log('GET /health', 'FAIL', `HTTP ${health.status}`);
    process.exit(1);
  }

  const otpRes = await req('/auth/request-otp', { phone: '78214898' });
  log('OTP request', otpRes.json.ok ? 'OK' : 'FAIL', otpRes.json.ok ? 'OTP enviado' : String(otpRes.json.error));

  const passengerToken = await login('78214898', '71542253-8');
  log('Login pasajero', 'OK', 'JWT emitido');

  const driverToken = await login('78981234', '12345678-9');
  log('Login conductor', 'OK', 'JWT emitido');

  const driverProf = await req('/users/me/profiles', undefined, driverToken);
  const driverId = String((driverProf.json.data as { driver?: { id?: string } })?.driver?.id ?? '');
  const vehicleId = String(
    (driverProf.json.data as { driver?: { vehicleId?: string } })?.driver?.vehicleId ?? ''
  );

  const sessionRes = await req(`/drivers/${driverId}/sessions/start`, { vehicleId }, driverToken);
  log('Sesión conductor', sessionRes.json.ok ? 'OK' : 'FAIL', sessionRes.json.ok ? 'Online' : String(sessionRes.json.error));

  let tripId = '';
  const requestPromise = new Promise<boolean>((resolve) => {
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(driverToken)}`);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 12000);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token: driverToken })));
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw)) as { type?: string };
        if (data.type === 'auth_ok') {
          ws.send(JSON.stringify({ type: 'driver_online', driverId }));
        }
        if (data.type === 'request_new') {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      } catch {
        /* ignore */
      }
    });
    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });

  const tripRes = await req(
    '/trips/request',
    {
      origin: { id: 'o', name: 'Metrocentro', coordinates: { latitude: 13.6992, longitude: -89.2244 } },
      destination: { id: 'd', name: 'Centro', coordinates: { latitude: 13.6929, longitude: -89.2182 } },
      tripType: 'shared',
      kind: 'ride',
      passengerCount: 1,
      passengerName: 'Juan Pasajero',
    },
    passengerToken
  );
  tripId = String((tripRes.json.data as { id?: string })?.id ?? '');
  log('Crear viaje', tripRes.json.ok && tripId ? 'OK' : 'FAIL', tripId || String(tripRes.json.error));

  const gotRequest = await requestPromise;
  log('WS request_new', gotRequest ? 'OK' : 'FAIL', gotRequest ? 'Conductor recibió solicitud' : 'Sin evento en 12s');

  const available = await req('/trips/available', undefined, driverToken);
  const availCount = ((available.json.data as { trips?: unknown[] })?.trips ?? []).length;
  log('GET /trips/available', available.json.ok ? 'OK' : 'FAIL', `${availCount} solicitud(es)`);

  const offerRes = await req(`/trips/${tripId}/offers`, { price: 3, etaMinutes: 5 }, driverToken);
  const offerId = String((offerRes.json.data as { offer?: { id: string } })?.offer?.id ?? '');
  log('Crear oferta', offerRes.json.ok && offerId ? 'OK' : 'FAIL', offerId || String(offerRes.json.error));

  const acceptRes = await req(`/trips/${tripId}/offers/${offerId}/accept`, {}, passengerToken);
  log('Aceptar oferta', acceptRes.json.ok ? 'OK' : 'FAIL', String((acceptRes.json.data as { lifecycleStatus?: string })?.lifecycleStatus ?? acceptRes.json.error));

  const chatBefore = await req(`/trips/${tripId}/chat`, undefined, passengerToken);
  const beforeCount = ((chatBefore.json.data as { messages?: unknown[] })?.messages ?? []).length;

  await req(`/trips/${tripId}/chat`, undefined, passengerToken);
  const wsChat = await new Promise<boolean>((resolve) => {
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(passengerToken)}`);
    const timeout = setTimeout(() => {
      ws.close();
      resolve(false);
    }, 8000);
    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token: passengerToken })));
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw)) as { type?: string; payload?: { text?: string } };
        if (data.type === 'auth_ok') ws.send(JSON.stringify({ type: 'subscribe_trip', tripId }));
        if (data.type === 'subscribed') ws.send(JSON.stringify({ type: 'send_chat', tripId, text: 'Remote QA ping' }));
        if (data.type === 'chat_message' && data.payload?.text?.includes('Remote QA')) {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        }
      } catch {
        /* ignore */
      }
    });
    ws.on('error', () => {
      clearTimeout(timeout);
      resolve(false);
    });
  });

  const chatAfter = await req(`/trips/${tripId}/chat`, undefined, passengerToken);
  const afterCount = ((chatAfter.json.data as { messages?: unknown[] })?.messages ?? []).length;
  log(
    'Chat REST+WS',
    wsChat && afterCount > beforeCount ? 'OK' : 'PARTIAL',
    `WS=${wsChat}, REST ${beforeCount}→${afterCount}`
  );

  const ownerToken = await login('71234567', '04567890-1');
  const ownerVeh = await req('/users/me/vehicles', undefined, ownerToken);
  const vehCount = ((ownerVeh.json.data as { vehicles?: unknown[] })?.vehicles ?? []).length;
  log('Dueño fleet', ownerVeh.json.ok && vehCount > 0 ? 'OK' : 'FAIL', `${vehCount} vehículo(s)`);

  const adminToken = await login('70801111', '00000000-0');
  const adminKpis = await req('/admin/kpis', undefined, adminToken);
  log('Admin KPIs', adminKpis.json.ok ? 'OK' : 'PARTIAL', adminKpis.json.ok ? 'Responde' : String(adminKpis.json.error));

  console.log('\n' + '═'.repeat(60));
  const ok = results.filter((r) => r.status === 'OK').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`RESULTADO: ${ok} OK, ${fail} FAIL de ${results.length} pruebas`);
  console.log('═'.repeat(60));

  if (fail > 0) process.exit(1);
}

run().catch((e) => {
  console.error('REMOTE QA CRASHED:', e);
  process.exit(1);
});
