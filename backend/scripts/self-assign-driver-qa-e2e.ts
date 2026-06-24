#!/usr/bin/env tsx
/**
 * QA — Owner self-assign driver + license persist + admin drivers list
 * Usage: npm run qa:self-assign-driver
 */
import { loginAsSuperAdmin, req, OTP } from './admin-qa-auth';
import { ownerRegisterPayload, QA_PASSWORD } from './qa-registration';

const API = process.env.API_URL ?? 'http://localhost:3001';

async function main() {
  const adminToken = await loginAsSuperAdmin();
  const phone = `73${String(Date.now()).slice(-6)}`;
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const reg = await req(
    '/owners/register',
    ownerRegisterPayload(phone, `${String(Date.now()).slice(-8)}-3`, 'Self', 'Assign Owner')
  );
  if (!reg.json.ok) throw new Error(`owner register: ${reg.json.error}`);
  const ownerToken = reg.json.data?.authToken as string;
  const ownerId = reg.json.data?.owner?.id as string;

  await req(`/admin/owners/${ownerId}/approve`, {}, adminToken);

  const plate = `D${String(Date.now()).slice(-5)}`;
  const vehicleReg = await req(
    '/vehicles/register',
    {
      unitNumber: '801',
      plateNumber: plate,
      associationName: 'Self Assign QA',
      vehicleType: 'mototaxi',
    },
    ownerToken
  );
  const vehicleId = vehicleReg.json.data?.vehicleId as string;
  await req(`/admin/vehicles/${vehicleId}/approve`, {}, adminToken);

  const assign = await req(
    '/owners/me/self-assign-driver',
    {
      vehicleId,
      licenseFront: 'https://example.com/license-front.jpg',
      licenseBack: 'https://example.com/license-back.jpg',
    },
    ownerToken
  );
  console.log('self-assign', assign.status, assign.json);
  if (!assign.json.driver && !assign.json.data?.driver) {
    throw new Error('self-assign failed');
  }
  const driver = assign.json.driver ?? assign.json.data?.driver;
  const driverId = driver.id as string;

  const vehicles = await req('/users/me/vehicles', undefined, ownerToken);
  const vehicleRow = (vehicles.json.data?.vehicles ?? vehicles.json.vehicles ?? []).find(
    (v: { vehicleId?: string; id?: string }) => v.vehicleId === vehicleId || v.id === vehicleId
  );
  if (!vehicleRow?.driver?.licenseFront) {
    throw new Error('license not persisted on vehicle driver payload');
  }

  const retry = await req(
    '/owners/me/self-assign-driver',
    {
      vehicleId,
      licenseFront: 'https://example.com/license-front-v2.jpg',
      licenseBack: 'https://example.com/license-back-v2.jpg',
    },
    ownerToken
  );
  if (retry.status >= 400) throw new Error(`retry self-assign failed: ${retry.json.error}`);

  const driversAdmin = await req('/admin/drivers', undefined, adminToken);
  const list = driversAdmin.json.data?.drivers ?? driversAdmin.json.drivers ?? [];
  const found = list.find((d: { id: string }) => d.id === driverId);
  if (!found) throw new Error('driver not in admin list');
  if (found.mvpStatus !== 'PENDING_APPROVAL') {
    throw new Error(`expected PENDING_APPROVAL, got ${found.mvpStatus}`);
  }

  const approve = await req(`/admin/drivers/${driverId}/approve`, {}, adminToken);
  if (!approve.json.ok && approve.status >= 400) {
    throw new Error(`approve failed: ${approve.json.error}`);
  }

  console.log('PASS: self-assign driver license persist + admin drivers list + approve');
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
