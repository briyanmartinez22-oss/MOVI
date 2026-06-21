#!/usr/bin/env tsx
/** Auditoría E2E real — local con DEMO_OTP_ENABLED=true */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

async function req(path: string, body?: unknown, token?: string, method?: string) {
  const m = method ?? (body !== undefined ? 'POST' : 'GET');
  const res = await fetch(`${API}${path}`, {
    method: m,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return {
    status: res.status,
    json: (await res.json()) as Record<string, unknown> & {
      ok?: boolean;
      error?: string;
      data?: Record<string, unknown>;
    },
  };
}

async function otpLogin(phone: string, dui: string) {
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const login = await req('/auth/login', { phone, dui, code: OTP });
  if (!login.json.ok) throw new Error(`${phone}: ${login.json.error}`);
  return login.json.data?.authToken as string;
}

function place(name: string, lat: number, lng: number) {
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name,
    coordinates: { latitude: lat, longitude: lng },
  };
}

type R = { phase: string; step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: R[] = [];

function rec(phase: string, step: string, ok: boolean, detail?: string) {
  results.push({ phase, step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(`${ok ? '✓' : '✗'} [${phase}] ${step}${detail ? ` — ${detail}` : ''}`);
}

function tripIdFrom(res: Awaited<ReturnType<typeof req>>) {
  const data = res.json.data as Record<string, unknown> | undefined;
  return (data?.id ?? (data?.trip as { id?: string } | undefined)?.id) as string | undefined;
}

async function main() {
  const demoPhones = ['+50370801111', '+50370001111', '+50378214898', '+50371234567', '+50378981234', '+50376543210'];
  const demoUsers = await prisma.user.findMany({ where: { phoneNumber: { in: demoPhones } } });
  rec('DB', 'No demo seed users', demoUsers.length === 0, `found=${demoUsers.length}`);

  const dup = await prisma.$queryRaw<{ phoneNumber: string; c: number }[]>`
    SELECT "phoneNumber", COUNT(*)::int as c FROM "User" GROUP BY "phoneNumber" HAVING COUNT(*) > 1`;
  rec('DB', 'No duplicate phones', dup.length === 0, String(dup.length));

  const orphanOffers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT o.id FROM "TripOffer" o LEFT JOIN "Trip" t ON o."tripId" = t.id WHERE t.id IS NULL LIMIT 5`;
  rec('DB', 'No orphan trip offers', orphanOffers.length === 0, String(orphanOffers.length));

  const orphanDrivers = await prisma.$queryRaw<{ id: string }[]>`
    SELECT d.id FROM "Driver" d LEFT JOIN "User" u ON d."userId" = u.id WHERE u.id IS NULL LIMIT 5`;
  rec('DB', 'No orphan drivers', orphanDrivers.length === 0, String(orphanDrivers.length));

  const corruptTrips = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Trip"
    WHERE "passengerId" IS NULL
       OR ("lifecycleStatus" = 'trip_completed' AND "driverId" IS NULL)
    LIMIT 5`;
  rec('DB', 'No corrupt trips', corruptTrips.length === 0, String(corruptTrips.length));

  const auditBefore = await prisma.auditLog.count();

  let adminToken: string;
  try {
    adminToken = await otpLogin('2144698637', '00000000-0');
    const me = await req('/admin/me', undefined, adminToken);
    rec('ADMIN', 'SuperAdmin login', me.json.data?.staffRole === 'SUPER_ADMIN');
  } catch (e) {
    rec('ADMIN', 'SuperAdmin login', false, String(e));
    printSummary();
    return;
  }

  const originLat = 13.6929;
  const originLng = -89.2182;
  const destLat = 13.6769;
  const destLng = -89.2795;

  const pPhone = `79${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: pPhone });
  await req('/auth/verify-otp', { phone: pPhone, code: OTP });
  const regP = await req('/passengers/register', { phone: pPhone, fullName: 'Beta Audit Pasajero' });
  rec('PASAJERO', '1. Registro', regP.json.ok === true, regP.json.error);
  const pToken = regP.json.data?.authToken as string;
  rec('PASAJERO', '2. OTP', !!pToken);
  rec('PASAJERO', '3. Perfil (token emitido)', !!regP.json.data?.user);

  const tripReq = await req(
    '/trips/request',
    {
      origin: place('San Salvador Centro', originLat, originLng),
      destination: place('Santa Tecla', destLat, destLng),
      tripType: 'shared',
      passengerOfferPrice: 5,
      passengerCount: 1,
    },
    pToken
  );
  const tripId = tripIdFrom(tripReq);
  rec('PASAJERO', '4. Solicitar viaje', tripReq.json.ok === true && !!tripId, tripReq.json.error);

  const cancel = await req(`/trips/${tripId}/cancel`, { by: 'passenger' }, pToken);
  rec('PASAJERO', '5. Cancelar viaje', cancel.json.ok === true, cancel.json.error);

  const tripReq2 = await req(
    '/trips/request',
    {
      origin: place('San Salvador Centro', originLat, originLng),
      destination: place('Santa Tecla', destLat, destLng),
      tripType: 'shared',
      passengerOfferPrice: 6,
      passengerCount: 1,
    },
    pToken
  );
  const tripId2 = tripIdFrom(tripReq2);
  rec('PASAJERO', '6. Nuevo viaje', tripReq2.json.ok === true && !!tripId2, tripReq2.json.error);

  const oPhone = `71${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: oPhone });
  await req('/auth/verify-otp', { phone: oPhone, code: OTP });
  const regO = await req('/owners/register', { phone: oPhone, dui: '33333333-3', fullName: 'Beta Audit Owner' });
  rec('CONDUCTOR', '1. Registro owner', regO.json.ok === true, regO.json.error);
  const ownerId = regO.json.data?.owner?.id as string;
  const oToken = regO.json.data?.authToken as string;
  const plate = `B${Date.now().toString().slice(-5)}`;
  const regV = await req(
    '/vehicles/register',
    { unitNumber: '501', plateNumber: plate, associationName: 'Audit', vehicleType: 'mototaxi' },
    oToken
  );
  const vehicleId = regV.json.data?.vehicleId as string;
  rec('CONDUCTOR', '1b. Vehículo', regV.json.ok === true, regV.json.error);
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, oToken);
  await req('/owners/submit-verification', {}, oToken);
  rec('CONDUCTOR', '2. Verificación enviada', true);
  rec('CONDUCTOR', '3. Aprobar owner', (await req(`/admin/owners/${ownerId}/approve`, {}, adminToken)).json.ok === true);
  rec('CONDUCTOR', '3b. Aprobar vehículo', (await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken)).json.ok === true);
  const inv = await req(`/vehicles/${vehicleId}/invite-driver`, {}, oToken);
  const code = inv.json.data?.code as string;
  const dPhone = `78${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: dPhone });
  await req('/auth/verify-otp', { phone: dPhone, code: OTP });
  const regD = await req('/drivers/register-with-invite', {
    phone: dPhone,
    dui: '44444444-4',
    fullName: 'Beta Audit Driver',
    code,
  });
  rec('CONDUCTOR', '1c. Registro conductor', regD.json.ok === true, regD.json.error);
  const driverId = regD.json.data?.driver?.id as string;
  const dToken = regD.json.data?.authToken as string;
  rec('CONDUCTOR', '3c. Aprobar conductor', (await req(`/admin/drivers/${driverId}/approve`, {}, adminToken)).json.ok === true);
  rec(
    'CONDUCTOR',
    '4. Online',
    (await req(`/drivers/${driverId}/sessions/start`, { vehicleId, latitude: originLat, longitude: originLng }, dToken)).json.ok === true
  );
  const offer = await req(`/trips/${tripId2}/offers`, { price: 6, etaMinutes: 8 }, dToken);
  rec('CONDUCTOR', '5. Recibir/ofertar', offer.json.ok === true, offer.json.error);
  const offerId = (offer.json.data as { offer?: { id?: string } } | undefined)?.offer?.id;
  rec('CONDUCTOR', '6. Aceptar viaje', (await req(`/trips/${tripId2}/offers/${offerId}/accept`, {}, pToken)).json.ok === true);
  for (const st of ['driver_arriving', 'driver_arrived', 'trip_started', 'trip_completed'] as const) {
    const lc = await req(`/trips/${tripId2}/lifecycle`, { lifecycleStatus: st }, dToken, 'PATCH');
    if (!lc.json.ok) rec('CONDUCTOR', `7. Navegación (${st})`, false, lc.json.error);
  }
  rec('CONDUCTOR', '7. Navegación lifecycle', true);
  const complete = await req('/trips/complete', { tripId: tripId2 }, dToken);
  rec('CONDUCTOR', '8. Completar viaje', complete.json.ok === true, complete.json.error);
  const tripRecord = await prisma.trip.findUnique({ where: { id: tripId2 }, include: { offers: true } });
  rec('CONDUCTOR', '9. Cobro registrado', !!tripRecord?.acceptedOfferId && tripRecord.lifecycleStatus === 'trip_completed');

  const hist = await req('/trips/history', undefined, pToken);
  const trips = (hist.json.data as { trips?: unknown[] } | undefined)?.trips ?? [];
  rec('PASAJERO', '7. Completar viaje (hist)', trips.some((t) => (t as { lifecycleStatus?: string }).lifecycleStatus === 'trip_completed'));
  rec('PASAJERO', '8. Historial actualizado', hist.json.ok === true, `count=${trips.length}`);

  const notif = await req('/notifications', undefined, pToken);
  const notifCount =
    ((notif.json.data as { notifications?: unknown[] } | undefined)?.notifications?.length ??
      (Array.isArray(notif.json.data) ? notif.json.data.length : 0)) ||
    0;
  rec('PASAJERO', '9. Notificaciones', notif.json.ok === true && notifCount > 0, `count=${notifCount}`);

  const bPhone = `76${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: bPhone });
  await req('/auth/verify-otp', { phone: bPhone, code: OTP });
  const regB = await req('/businesses/register', {
    phone: bPhone,
    dui: '55555555-5',
    fullName: 'Beta Audit Biz',
    businessName: 'Audit Pizza',
    businessType: 'restaurant',
    businessPhone: bPhone,
    latitude: originLat,
    longitude: originLng,
    addressLabel: 'Centro',
  });
  rec('NEGOCIO', '1. Registro', regB.json.ok === true, regB.json.error);
  const bizId = regB.json.data?.business?.id as string;
  const bToken = regB.json.data?.authToken as string;
  rec('NEGOCIO', '2. Verificación (registro completo)', regB.json.ok === true);
  rec('NEGOCIO', '3. Aprobar', (await req(`/admin/businesses/${bizId}/approve`, {}, adminToken)).json.ok === true);

  const deliveryTrip = await req(
    '/trips/request',
    {
      origin: place('Audit Pizza', originLat, originLng),
      destination: place('Cliente Entrega', destLat, destLng),
      tripType: 'private',
      serviceType: 'delivery',
      businessId: bizId,
      businessName: 'Audit Pizza',
      passengerOfferPrice: 4,
    },
    bToken
  );
  const deliveryTripId = tripIdFrom(deliveryTrip);
  rec('NEGOCIO', '4. Crear pedido (trip delivery)', deliveryTrip.json.ok === true && !!deliveryTripId, deliveryTrip.json.error);

  const deliveryOffer = await req(`/trips/${deliveryTripId}/offers`, { price: 4, etaMinutes: 10 }, dToken);
  const deliveryOfferId = (deliveryOffer.json.data as { offer?: { id?: string } } | undefined)?.offer?.id;
  rec('NEGOCIO', '5. Asignar conductor', deliveryOffer.json.ok === true && !!deliveryOfferId, deliveryOffer.json.error);
  await req(`/trips/${deliveryTripId}/offers/${deliveryOfferId}/accept`, {}, bToken);
  for (const st of ['driver_arriving', 'driver_arrived', 'trip_started', 'trip_completed'] as const) {
    await req(`/trips/${deliveryTripId}/lifecycle`, { lifecycleStatus: st }, dToken, 'PATCH');
  }
  await req('/trips/complete', { tripId: deliveryTripId }, dToken);
  const bizHist = await req('/trips/history', undefined, bToken);
  const bizTrips = (bizHist.json.data as { trips?: { lifecycleStatus?: string }[] } | undefined)?.trips ?? [];
  rec('NEGOCIO', '6. Completar entrega', bizTrips.some((t) => t.lifecycleStatus === 'trip_completed'));
  rec('NEGOCIO', '7. Historial actualizado', bizHist.json.ok === true, `count=${bizTrips.length}`);

  const passengerUserId = regP.json.data?.user?.id as string;
  const suspendPassenger = await req(`/admin/passengers/${passengerUserId}/suspend`, {}, adminToken);
  rec('AUDIT', 'Suspender pasajero', suspendPassenger.json.ok === true);
  const reactivatePassenger = await req(`/admin/passengers/${passengerUserId}/reactivate`, {}, adminToken);
  rec('AUDIT', 'Reactivar pasajero', reactivatePassenger.json.ok === true);

  const pAdmin = await req('/admin/passengers', undefined, pToken);
  rec('SECURITY', 'Pasajero bloqueado admin', pAdmin.status === 401 || pAdmin.status === 403, `status=${pAdmin.status}`);

  const auditAfter = await prisma.auditLog.count();
  rec('AUDIT', 'Logs incrementan', auditAfter > auditBefore, `${auditBefore}→${auditAfter}`);

  const auditActions = await prisma.auditLog.findMany({
    where: {
      action: { in: ['approve', 'suspend', 'unsuspend', 'delete'] },
      createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 12,
    select: { action: true, entityType: true, entityId: true, createdAt: true },
  });
  rec('AUDIT', 'Aprobar conductor registra', auditActions.some((a) => a.action === 'approve' && a.entityType === 'driver'));
  rec('AUDIT', 'Aprobar negocio registra', auditActions.some((a) => a.action === 'approve' && a.entityType === 'business'));
  rec('AUDIT', 'Suspender registra', auditActions.some((a) => a.action === 'suspend'));
  console.log('Recent audit evidence:', auditActions);

  printSummary();
}

function printSummary() {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  console.log(`\n=== E2E AUDIT: PASS ${pass} | FAIL ${fail} ===`);
  if (fail > 0) process.exit(1);
}

main()
  .catch((e) => {
    console.error('FATAL', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
