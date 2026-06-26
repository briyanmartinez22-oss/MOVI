#!/usr/bin/env tsx
/**
 * Auditoría Operations Live — tablas, endpoints, limpieza beta, GPS conductor.
 * Usage:
 *   API_URL=http://localhost:3001 npx tsx scripts/operations-live-production-audit.ts
 *   API_URL=https://movi-production-ef3b.up.railway.app ADMIN_TOKEN=<jwt> npx tsx scripts/operations-live-production-audit.ts --reset
 */
import { PrismaClient } from '@prisma/client';
import { loginAsSuperAdmin, req, API, OTP } from './admin-qa-auth';
import { driverInviteRegisterPayload, ownerRegisterPayload } from './qa-registration';

const RESET = process.argv.includes('--reset');
const prisma = new PrismaClient();

type TableCount = { table: string; count: number };

async function dbCounts(): Promise<TableCount[]> {
  const tables: TableCount[] = [];
  const pairs: [string, () => Promise<number>][] = [
    ['Trip', () => prisma.trip.count()],
    ['Trip (pending/active)', () =>
      prisma.trip.count({
        where: {
          lifecycleStatus: {
            in: [
              'requested',
              'offered',
              'accepted',
              'driver_arriving',
              'driver_arrived',
              'trip_started',
            ],
          },
        },
      })],
    ['TripOffer', () => prisma.tripOffer.count()],
    ['DriverSession (online)', () =>
      prisma.driverSession.count({ where: { disconnectedAt: null } })],
    ['LocationPing', () => prisma.locationPing.count()],
    ['OperationalAlert (open)', () =>
      prisma.operationalAlert.count({ where: { status: { in: ['open', 'acknowledged'] } } })],
    ['OperationalAlert (all)', () => prisma.operationalAlert.count()],
    ['Driver', () => prisma.driver.count()],
    ['Owner', () => prisma.owner.count()],
    ['User', () => prisma.user.count()],
  ];
  for (const [table, fn] of pairs) {
    tables.push({ table, count: await fn() });
  }
  return tables;
}

async function apiOpsCounts(token: string) {
  const snapshot = await req('/admin/operations-live/snapshot', undefined, token);
  const drivers = await req('/admin/operations-live/drivers', undefined, token);
  const trips = await req('/admin/operations-live/trips', undefined, token);
  const opsAlerts = await req('/admin/operations-live/alerts', undefined, token);
  const adminAlerts = await req('/admin/alerts', undefined, token);
  const summary = await req('/admin/system/data-summary', undefined, token);

  return {
    snapshot: snapshot.json.data,
    drivers: (drivers.json.data?.drivers as unknown[])?.length ?? 0,
    trips: (trips.json.data?.trips as unknown[])?.length ?? 0,
    opsAlerts: (opsAlerts.json.data?.alerts as unknown[])?.length ?? 0,
    adminAlerts: (adminAlerts.json.data?.alerts as unknown[])?.length ?? 0,
    dataSummary: summary.json.data ?? summary.json,
    opsAlertSample: (opsAlerts.json.data?.alerts as { type?: string; message?: string }[])?.slice(0, 3),
    adminAlertSample: (adminAlerts.json.data?.alerts as { type?: string; message?: string }[])?.slice(0, 3),
    tripSample: (trips.json.data?.trips as { id?: string; passengerName?: string; lifecycleStatus?: string }[])?.slice(0, 3),
    driverSample: (drivers.json.data?.drivers as { name?: string; driverId?: string }[])?.slice(0, 3),
  };
}

async function resetBetaApi(token: string) {
  const res = await req(
    '/admin/system/reset-beta',
    { confirm: 'RESET_BETA_PLATFORM' },
    token,
    'POST'
  );
  return res;
}

async function driverGpsE2E(adminToken: string) {
  const originLat = 13.6929;
  const originLng = -89.2182;
  const oPhone = `71${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: oPhone });
  await req('/auth/verify-otp', { phone: oPhone, code: OTP });
  const regO = await req(
    '/owners/register',
    ownerRegisterPayload(oPhone, '33333333-3', 'Ops', 'Audit Owner'),
    undefined,
    'POST'
  );
  if (!regO.json.ok) return { ok: false, error: `owner: ${regO.json.error}` };
  const ownerId = regO.json.data?.owner?.id as string;
  const oToken = regO.json.data?.authToken as string;
  const plate = `O${Date.now().toString().slice(-5)}`;
  const regV = await req(
    '/vehicles/register',
    { unitNumber: '901', plateNumber: plate, associationName: 'OpsAudit', vehicleType: 'mototaxi' },
    oToken
  );
  const vehicleId = regV.json.data?.vehicleId as string;
  await req(`/vehicles/${vehicleId}/submit-verification`, {}, oToken);
  await req('/owners/submit-verification', {}, oToken);
  await req(`/admin/owners/${ownerId}/approve`, {}, adminToken);
  await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);
  const inv = await req(`/vehicles/${vehicleId}/invite-driver`, {}, oToken);
  const code = inv.json.data?.code as string;
  const dPhone = `78${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone: dPhone });
  await req('/auth/verify-otp', { phone: dPhone, code: OTP });
  const regD = await req(
    '/drivers/register-with-invite',
    driverInviteRegisterPayload(dPhone, code, 'Ops', 'Live Driver'),
    undefined,
    'POST'
  );
  if (!regD.json.ok) return { ok: false, error: `driver: ${regD.json.error}` };
  const driverId = regD.json.data?.driver?.id as string;
  const dToken = regD.json.data?.authToken as string;
  await req(`/admin/drivers/${driverId}/approve`, {}, adminToken);

  const beforeDrivers = await req('/admin/operations-live/drivers', undefined, adminToken);
  const beforeCount = (beforeDrivers.json.data?.drivers as unknown[])?.length ?? 0;

  const start = await req(
    `/drivers/${driverId}/sessions/start`,
    { vehicleId, latitude: originLat, longitude: originLng },
    dToken
  );
  if (!start.json.ok) return { ok: false, error: `session: ${start.json.error}` };

  const afterStart = await req('/admin/operations-live/drivers', undefined, adminToken);
  const drivers = afterStart.json.data?.drivers as {
    driverId?: string;
    name?: string;
    latitude?: number;
    longitude?: number;
  }[];
  const found = drivers?.find((d) => d.driverId === driverId);

  const end = await req(`/drivers/${driverId}/sessions/end`, {}, dToken);
  const afterEnd = await req('/admin/operations-live/drivers', undefined, adminToken);
  const endCount = (afterEnd.json.data?.drivers as unknown[])?.length ?? 0;

  return {
    ok: Boolean(found),
    driverId,
    beforeCount,
    afterStartCount: drivers?.length ?? 0,
    afterEndCount: endCount,
    coordinates: found ? { lat: found.latitude, lng: found.longitude } : null,
    name: found?.name,
    sessionEndOk: end.json.ok === true,
    appearedOnMap: Boolean(found),
  };
}

async function main() {
  console.log('=== MOVI Operations Live Audit ===');
  console.log('API:', API);
  console.log('Reset:', RESET);
  console.log('');

  const isLocalDb = API.includes('localhost') || API.includes('127.0.0.1');
  let dbBefore: TableCount[] | null = null;
  if (isLocalDb) {
    dbBefore = await dbCounts();
    console.log('--- DB ANTES ---');
    dbBefore.forEach((r) => console.log(`${r.table}: ${r.count}`));
    console.log('');
  }

  let token: string;
  try {
    token = await loginAsSuperAdmin();
  } catch (e) {
    console.error('AUTH FAILED:', (e as Error).message);
    console.error('Producción requiere ADMIN_TOKEN o ADMIN_QA_TOKEN con JWT SUPER_ADMIN.');
    process.exit(1);
  }

  const apiBefore = await apiOpsCounts(token);
  console.log('--- API OPS LIVE ANTES ---');
  console.log(JSON.stringify(apiBefore, null, 2));
  console.log('');

  if (RESET) {
    const resetRes = await resetBetaApi(token);
    console.log('--- RESET BETA ---');
    console.log(resetRes.status, JSON.stringify(resetRes.json, null, 2));
    console.log('');
  }

  let dbAfter: TableCount[] | null = null;
  if (isLocalDb) {
    dbAfter = await dbCounts();
    console.log('--- DB DESPUÉS ---');
    dbAfter.forEach((r) => console.log(`${r.table}: ${r.count}`));
    console.log('');
  }

  const apiAfter = await apiOpsCounts(token);
  console.log('--- API OPS LIVE DESPUÉS ---');
  console.log(JSON.stringify(apiAfter, null, 2));
  console.log('');

  if (!RESET) {
    console.log('--- DRIVER GPS E2E ---');
    const gps = await driverGpsE2E(token);
    console.log(JSON.stringify(gps, null, 2));
  }
}

main()
  .catch((e) => {
    console.error('FATAL', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
