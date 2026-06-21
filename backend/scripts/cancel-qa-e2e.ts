#!/usr/bin/env tsx
/**
 * MOVI Cancellation QA — E2E checklist
 *
 * Manual checklist:
 * 1. Pasajero cancela en /passenger/matching → confirmación → home pasajero → éxito
 * 2. Pasajero cancela en /passenger/offers → idem
 * 3. Pasajero cancela en /passenger/driver → idem
 * 4. Pasajero cancela en /passenger/trip → idem
 * 5. Conductor cancela en /driver/trip-active → home conductor → éxito
 * 6. Conductor cancela desde /driver con viaje asignado → idem
 * 7. Contraparte recibe notificación trip_cancelled (push/in-app)
 * 8. Historial muestra badge Cancelado + quién canceló
 * 9. Entrega/mensajería (kind delivery) cancela igual que viaje
 * 10. Error visible si se reintenta cancelar viaje ya cancelado
 *
 * Usage: npm run qa:cancel
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';
const PASSENGER_PHONE = '78214898';
const PASSENGER_DUI = '71542253-8';
const DRIVER_PHONE = '78981234';
const DRIVER_DUI = '12345678-9';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
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

const ORIGIN = {
  id: 'o',
  name: 'Metrocentro',
  coordinates: { latitude: 13.6992, longitude: -89.2244 },
};
const DEST = {
  id: 'd',
  name: 'Centro',
  coordinates: { latitude: 13.6929, longitude: -89.2182 },
};

async function createTrip(passengerToken: string) {
  const tripReq = await req(
    '/trips/request',
    {
      origin: ORIGIN,
      destination: DEST,
      tripType: 'shared',
      kind: 'ride',
      passengerCount: 1,
      description: 'Cancel QA trip',
      passengerName: 'QA Cancel Pax',
      requiredVehicleType: 'mototaxi',
      requestMode: 'NOW',
    },
    passengerToken
  );
  return tripReq.json.data?.id as string;
}

async function acceptTripFlow(tripId: string, passengerToken: string, driverToken: string) {
  const offer = await req(`/trips/${tripId}/offers`, { price: 3.5, etaMinutes: 6 }, driverToken);
  const offerId = offer.json.data?.offer?.id as string;
  record('Oferta creada para cancel QA', offer.json.ok === true && !!offerId, offer.json.error);
  const accept = await req(`/trips/${tripId}/offers/${offerId}/accept`, {}, passengerToken);
  record('Oferta aceptada para cancel QA', accept.json.ok === true, accept.json.error);
  return offerId;
}

async function run() {
  console.log('MOVI Cancellation QA —', API, '\n');

  const health = await req('/health');
  record('Health check', health.json.status === 'ok');

  const passengerToken = await loginAs(PASSENGER_PHONE, PASSENGER_DUI);
  const driverToken = await loginAs(DRIVER_PHONE, DRIVER_DUI);

  const driverProfiles = await req('/users/me/profiles', undefined, driverToken);
  const driverId = driverProfiles.json.data?.driver?.id as string | undefined;
  const vehicleId = driverProfiles.json.data?.driver?.vehicleId as string | undefined;
  if (driverId && vehicleId) {
    await req(
      `/drivers/${driverId}/sessions/start`,
      { vehicleId, latitude: ORIGIN.coordinates.latitude, longitude: ORIGIN.coordinates.longitude },
      driverToken
    );
  }

  // Passenger cancels before driver assigned
  const trip1 = await createTrip(passengerToken);
  record('Crear viaje (pre-asignación)', !!trip1);
  const cancelPre = await req(`/trips/${trip1}/cancel`, { by: 'passenger' }, passengerToken);
  record(
    'POST /trips/:id/cancel — pasajero (sin conductor)',
    cancelPre.json.ok === true && cancelPre.json.data?.lifecycleStatus === 'cancelled',
    cancelPre.json.error
  );
  record(
    'cancelledBy=passenger (pre-asignación)',
    cancelPre.json.data?.cancelledBy === 'passenger',
    `got=${cancelPre.json.data?.cancelledBy}`
  );

  // Passenger cancels after accept
  const trip2 = await createTrip(passengerToken);
  await acceptTripFlow(trip2, passengerToken, driverToken);
  const cancelPax = await req(`/trips/${trip2}/cancel`, { by: 'passenger' }, passengerToken);
  record(
    'POST /trips/:id/cancel — pasajero (con conductor)',
    cancelPax.json.ok === true && cancelPax.json.data?.lifecycleStatus === 'cancelled',
    cancelPax.json.error
  );
  record('cancelledAt presente', typeof cancelPax.json.data?.cancelledAt === 'number');

  // Driver cancels after accept
  const trip3 = await createTrip(passengerToken);
  await acceptTripFlow(trip3, passengerToken, driverToken);
  const cancelDriver = await req(`/trips/${trip3}/cancel`, { by: 'driver' }, driverToken);
  record(
    'POST /trips/:id/cancel — conductor',
    cancelDriver.json.ok === true && cancelDriver.json.data?.cancelledBy === 'driver',
    cancelDriver.json.error
  );

  // Spoof by role rejected
  const trip4 = await createTrip(passengerToken);
  const spoof = await req(`/trips/${trip4}/cancel`, { by: 'driver' }, passengerToken);
  record(
    'Pasajero no puede cancelar como driver',
    spoof.json.ok === false,
    spoof.json.error
  );
  await req(`/trips/${trip4}/cancel`, { by: 'passenger' }, passengerToken);

  // Double cancel fails
  const double = await req(`/trips/${trip2}/cancel`, { by: 'passenger' }, passengerToken);
  record('Re-cancelar viaje ya cancelado falla', double.json.ok === false, double.json.error);

  // History includes cancelled
  const history = await req('/trips/history', undefined, passengerToken);
  const trips = history.json.data?.trips ?? [];
  const cancelledCount = trips.filter((t: { lifecycleStatus: string }) => t.lifecycleStatus === 'cancelled').length;
  record(
    'GET /trips/history incluye cancelados',
    history.json.ok === true && cancelledCount >= 2,
    `cancelled=${cancelledCount}`
  );

  // Delivery kind compatibility
  const deliveryTrip = await req(
    '/trips/request',
    {
      origin: ORIGIN,
      destination: DEST,
      tripType: 'private',
      kind: 'delivery',
      deliveryCategory: 'package',
      passengerCount: 1,
      description: 'Paquete QA cancel',
      passengerName: 'QA Cancel Delivery',
      requiredVehicleType: 'mototaxi',
      requestMode: 'NOW',
    },
    passengerToken
  );
  const deliveryId = deliveryTrip.json.data?.id as string;
  const cancelDelivery = await req(`/trips/${deliveryId}/cancel`, { by: 'passenger' }, passengerToken);
  record(
    'Cancelación entrega/mensajería (kind=delivery)',
    cancelDelivery.json.ok === true && cancelDelivery.json.data?.lifecycleStatus === 'cancelled',
    cancelDelivery.json.error
  );

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n--- Resultado: ${passed}/${results.length} PASS, ${failed} FAIL ---`);
  if (failed > 0) process.exit(1);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
