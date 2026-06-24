#!/usr/bin/env tsx
/**
 * QA — Delete scoped: solo el elemento seleccionado, sin borrar otros owners/users.
 * Usage: npm run qa:scoped-delete
 */
import { loginAsSuperAdmin, req, OTP } from './admin-qa-auth';
import { ownerRegisterPayload } from './qa-registration';

async function registerOwner(suffix: string) {
  const phone = `${suffix}${String(Date.now()).slice(-7)}`;
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const dui = `${String(Date.now()).slice(-8)}-${suffix}`;
  const reg = await req(
    '/owners/register',
    ownerRegisterPayload(phone, dui, 'Scoped', `Owner ${suffix}`)
  );
  if (!reg.json.ok) throw new Error(`register ${suffix}: ${reg.json.error}`);
  return {
    phone,
    ownerId: reg.json.data?.owner?.id as string,
    token: reg.json.data?.authToken as string,
  };
}

async function main() {
  const adminToken = await loginAsSuperAdmin();

  const ownerA = await registerOwner('1');
  const ownerB = await registerOwner('2');

  const listBefore = await req('/admin/owners', undefined, adminToken);
  const countBefore = (listBefore.json.data?.owners ?? []).length;

  const delA = await req(`/admin/owners/${ownerA.ownerId}`, undefined, adminToken, 'DELETE');
  if (!delA.json.ok) throw new Error(`delete owner A: ${delA.json.error}`);

  const listAfter = await req('/admin/owners', undefined, adminToken);
  const ownersAfter = listAfter.json.data?.owners ?? [];
  const ownerBStill = ownersAfter.some((o: { id: string }) => o.id === ownerB.ownerId);
  if (!ownerBStill) throw new Error('owner B was deleted when deleting owner A');
  if (ownersAfter.length !== countBefore - 1) {
    throw new Error(`expected ${countBefore - 1} owners, got ${ownersAfter.length}`);
  }

  const plate = `S${String(Date.now()).slice(-5)}`;
  const vehicleReg = await req(
    '/vehicles/register',
    {
      unitNumber: '901',
      plateNumber: plate,
      associationName: 'Scoped Delete QA',
      vehicleType: 'mototaxi',
    },
    ownerB.token
  );
  const vehicleId = vehicleReg.json.data?.vehicleId as string;
  if (!vehicleId) throw new Error('vehicle register failed');

  const delVehicle = await req(`/admin/vehicles/${vehicleId}`, undefined, adminToken, 'DELETE');
  if (!delVehicle.json.ok) throw new Error(`delete vehicle: ${delVehicle.json.error}`);

  const ownerBDetail = await req('/admin/owners', undefined, adminToken);
  const ownerBInList = (ownerBDetail.json.data?.owners ?? []).some(
    (o: { id: string }) => o.id === ownerB.ownerId
  );
  if (!ownerBInList) throw new Error('owner B missing after vehicle delete');

  const vehiclesAfter = await req('/admin/vehicles', undefined, adminToken);
  const vehicleList = vehiclesAfter.json.data?.vehicles ?? [];
  const vehicleStill = vehicleList.some((v: { id: string }) => v.id === vehicleId);
  if (vehicleStill) throw new Error('vehicle still listed after delete');

  console.log('PASS: scoped delete — owner A removed, owner B intact, vehicle removed without owner');
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
