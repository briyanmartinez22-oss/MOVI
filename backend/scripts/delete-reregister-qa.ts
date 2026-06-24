#!/usr/bin/env tsx
/** Verifica que eliminar owner libera teléfono para nuevo registro. */
import { loginAsSuperAdmin, req, OTP } from './admin-qa-auth';
import { ownerRegisterPayload } from './qa-registration';

async function main() {
  const token = await loginAsSuperAdmin();
  const phone = `71${Date.now().toString().slice(-6)}`;
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const reg = await req(
    '/owners/register',
    ownerRegisterPayload(phone, '88888888-8', 'Delete', 'Test Owner')
  );
  if (!reg.json.ok) throw new Error(`register failed: ${reg.json.error}`);
  const ownerId = reg.json.data?.owner?.id as string;
  console.log('registered owner', ownerId, phone);

  const del = await req(`/admin/owners/${ownerId}`, undefined, token, 'DELETE');
  console.log('delete', del.status, del.json);
  if (!del.json.ok) throw new Error('delete failed');

  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  const reg2 = await req(
    '/owners/register',
    ownerRegisterPayload(phone, '88888888-8', 'Delete', 'Test Owner 2')
  );
  console.log('re-register', reg2.status, reg2.json.ok, reg2.json.error ?? 'ok');
  if (!reg2.json.ok) throw new Error(`re-register failed: ${reg2.json.error}`);
  console.log('PASS: phone freed after owner delete');
}

main().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
