#!/usr/bin/env tsx
/**
 * MOVI FASE CRÍTICA — multi-user E2E: pasajero → conductor → oferta
 * Usage: npx tsx scripts/critical-e2e.ts
 */
import WebSocket from 'ws';

const API = process.env.API_URL ?? 'http://localhost:3001';
const WS = process.env.WS_URL ?? 'ws://localhost:3001/ws';
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
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

async function otpFlow(phone: string) {
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
}

async function login(phone: string, dui: string): Promise<string> {
  await otpFlow(phone);
  const res = await req('/auth/login', { phone, dui, code: OTP });
  if (!res.json.ok) throw new Error(String(res.json.error ?? 'login failed'));
  return (res.json.data as { authToken: string }).authToken;
}

function waitForWsEvent(
  token: string,
  eventType: string,
  onAuth?: (ws: WebSocket) => void,
  timeoutMs = 10000
): Promise<{ received: boolean; payload?: unknown }> {
  return new Promise((resolve) => {
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(token)}`);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ received: false });
    }, timeoutMs);

    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'auth', token }));
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw)) as { type?: string; payload?: unknown };
        if (data.type === 'auth_ok' && onAuth) {
          onAuth(ws);
        }
        if (data.type === eventType) {
          clearTimeout(timeout);
          ws.close();
          resolve({ received: true, payload: data.payload });
        }
      } catch {
        /* ignore */
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      resolve({ received: false });
    });
  });
}

async function run() {
  console.log('═'.repeat(60));
  console.log('MOVI FASE CRÍTICA E2E —', API);
  console.log('═'.repeat(60));

  const passengerToken = await login('78214898', '71542253-8');
  const driverToken = await login('78981234', '12345678-9');

  const driverProf = await req('/users/me/profiles', undefined, driverToken);
  const driverId = String((driverProf.json.data as { driver?: { id?: string } })?.driver?.id ?? '');
  const vehicleId = String(
    (driverProf.json.data as { driver?: { vehicleId?: string } })?.driver?.vehicleId ?? ''
  );

  if (!driverId || !vehicleId) {
    log('Setup conductor', 'FAIL', 'Sin driverId/vehicleId en perfil seed');
    process.exit(1);
  }

  const sessionRes = await req(
    `/drivers/${driverId}/sessions/start`,
    { vehicleId },
    driverToken
  );
  if (!sessionRes.json.ok) {
    log('Sesión conductor', 'FAIL', String(sessionRes.json.error));
    process.exit(1);
  }
  log('Sesión conductor', 'OK', 'Conductor online con sesión activa');

  const requestPromise = waitForWsEvent(driverToken, 'request_new', (ws) => {
    ws.send(JSON.stringify({ type: 'driver_online', driverId }));
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

  if (!tripRes.json.ok) {
    log('Crear viaje', 'FAIL', String(tripRes.json.error));
    process.exit(1);
  }

  const tripId = String((tripRes.json.data as { id: string }).id);
  log('Crear viaje', 'OK', `Trip ${tripId} creado`);

  const requestEvent = await requestPromise;
  if (requestEvent.received) {
    const payload = requestEvent.payload as { id?: string } | undefined;
    log(
      'Conductor recibe solicitud (WS)',
      payload?.id === tripId ? 'OK' : 'PARTIAL',
      `request_new recibido, tripId=${payload?.id ?? 'n/a'}`
    );
  } else {
    log('Conductor recibe solicitud (WS)', 'FAIL', 'No llegó request_new en 10s');
  }

  const availableRes = await req('/trips/available', undefined, driverToken);
  const availableTrips =
    (availableRes.json.data as { trips?: { id: string }[] })?.trips ?? [];
  if (availableRes.json.ok && availableTrips.some((t) => t.id === tripId)) {
    log('Conductor polling REST', 'OK', `GET /trips/available incluye ${tripId}`);
  } else {
    log('Conductor polling REST', 'PARTIAL', `available=${availableTrips.length} viaje(s)`);
  }

  const offerPromise = waitForWsEvent(passengerToken, 'offer_created', (ws) => {
    ws.send(JSON.stringify({ type: 'subscribe_trip', tripId }));
  });

  await new Promise((r) => setTimeout(r, 500));

  const offerRes = await req(`/trips/${tripId}/offers`, { price: 3, etaMinutes: 5 }, driverToken);
  if (!offerRes.json.ok) {
    log('Conductor oferta', 'FAIL', String(offerRes.json.error));
    process.exit(1);
  }
  const offerId = String((offerRes.json.data as { offer: { id: string } }).offer.id);
  log('Conductor oferta', 'OK', `Oferta ${offerId} creada`);

  const offerEvent = await offerPromise;
  if (offerEvent.received) {
    const trip = offerEvent.payload as { offers?: unknown[] } | undefined;
    log(
      'Pasajero recibe oferta (WS)',
      (trip?.offers?.length ?? 0) > 0 ? 'OK' : 'PARTIAL',
      `offer_created con ${trip?.offers?.length ?? 0} oferta(s)`
    );
  } else {
    log('Pasajero recibe oferta (WS)', 'FAIL', 'No llegó offer_created en 10s');
  }

  const acceptRes = await req(`/trips/${tripId}/offers/${offerId}/accept`, {}, passengerToken);
  if (acceptRes.json.ok) {
    log('Pasajero acepta oferta', 'OK', `lifecycle=${(acceptRes.json.data as { lifecycleStatus?: string }).lifecycleStatus}`);
  } else {
    log('Pasajero acepta oferta', 'FAIL', String(acceptRes.json.error));
  }

  const chatBefore = await req(`/trips/${tripId}/chat`, undefined, passengerToken);
  const msgCountBefore = ((chatBefore.json.data as { messages?: unknown[] })?.messages ?? []).length;

  const wsChat = await new Promise<{ sent: boolean; received: boolean }>((resolve) => {
    let sent = false;
    let received = false;
    const ws = new WebSocket(`${WS}?token=${encodeURIComponent(passengerToken)}`);
    const timeout = setTimeout(() => {
      ws.close();
      resolve({ sent, received });
    }, 8000);

    ws.on('open', () => ws.send(JSON.stringify({ type: 'auth', token: passengerToken })));
    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(String(raw)) as { type?: string; payload?: { text?: string } };
        if (data.type === 'auth_ok') {
          ws.send(JSON.stringify({ type: 'subscribe_trip', tripId }));
        }
        if (data.type === 'subscribed') {
          ws.send(JSON.stringify({ type: 'send_chat', tripId, text: 'Mensaje critical E2E' }));
          sent = true;
        }
        if (data.type === 'chat_message' && data.payload?.text?.includes('critical E2E')) {
          received = true;
          clearTimeout(timeout);
          ws.close();
          resolve({ sent, received });
        }
      } catch {
        /* ignore */
      }
    });
    ws.on('error', () => {
      clearTimeout(timeout);
      resolve({ sent, received });
    });
  });

  const chatAfter = await req(`/trips/${tripId}/chat`, undefined, passengerToken);
  const msgCountAfter = ((chatAfter.json.data as { messages?: unknown[] })?.messages ?? []).length;

  if (wsChat.sent && wsChat.received && msgCountAfter > msgCountBefore) {
    log('Chat historial REST+WS', 'OK', `REST ${msgCountBefore}→${msgCountAfter}, WS OK`);
  } else {
    log(
      'Chat historial REST+WS',
      'PARTIAL',
      `WS sent=${wsChat.sent} recv=${wsChat.received}, REST ${msgCountBefore}→${msgCountAfter}`
    );
  }

  const chatReopen = await req(`/trips/${tripId}/chat`, undefined, driverToken);
  const reopenCount = ((chatReopen.json.data as { messages?: unknown[] })?.messages ?? []).length;
  if (chatReopen.json.ok && reopenCount >= msgCountAfter) {
    log('Chat reabrir historial', 'OK', `${reopenCount} mensaje(s) persistidos tras reabrir`);
  } else {
    log('Chat reabrir historial', 'FAIL', `Esperado ≥${msgCountAfter}, obtuvo ${reopenCount}`);
  }

  const ownerToken = await login('71234567', '04567890-1');
  const ownerVeh = await req('/users/me/vehicles', undefined, ownerToken);
  const ownerVehicleCount = ((ownerVeh.json.data as { vehicles?: unknown[] })?.vehicles ?? []).length;
  if (ownerVeh.json.ok && ownerVehicleCount > 0) {
    log('Dueño ve vehículos', 'OK', `${ownerVehicleCount} vehículo(s) en fleet`);
  } else {
    log('Dueño ve vehículos', 'FAIL', String(ownerVeh.json.error ?? 'sin vehículos'));
  }

  const adminToken = await login('70801111', '00000000-0');
  const adminKpis = await req('/admin/kpis', undefined, adminToken);
  if (adminKpis.json.ok) {
    log('Admin KPIs', 'OK', 'GET /admin/kpis responde');
  } else {
    log('Admin KPIs', 'PARTIAL', String(adminKpis.json.error ?? adminKpis.status));
  }

  console.log('\n' + '═'.repeat(60));
  console.log('RESUMEN FASE CRÍTICA');
  console.log('═'.repeat(60));
  const ok = results.filter((r) => r.status === 'OK').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const partial = results.filter((r) => r.status === 'PARTIAL').length;
  console.log(`✅ OK: ${ok}  ⚠️ Parcial: ${partial}  ❌ FAIL: ${fail}`);

  if (fail > 0) {
    console.log('\nFALLAS:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(`  - ${r.name}: ${r.evidence}`));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('CRITICAL E2E CRASHED:', e);
  process.exit(1);
});
