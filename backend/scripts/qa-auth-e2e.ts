#!/usr/bin/env tsx
/**
 * QA — Phone + Password authentication (Login V2)
 * Usage: npm run qa:auth
 */
import { loginAsSuperAdmin, req, OTP, API } from './admin-qa-auth';
import {
  QA_PASSWORD,
  driverInviteRegisterPayload,
  loginWithPassword,
  ownerRegisterPayload,
} from './qa-registration';

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

function uniquePhone(prefix: string): string {
  return `${prefix}${String(Date.now()).slice(-6)}`;
}

async function registerPassenger(phone: string) {
  await req('/auth/request-otp', { phone });
  await req('/auth/verify-otp', { phone, code: OTP });
  return req('/passengers/register', { phone, fullName: 'QA Auth Passenger', password: QA_PASSWORD });
}

async function run() {
  console.log('MOVI Auth QA (Login V2) —', API, '\n');

  const badLogin = await req('/auth/login', { phone: uniquePhone('70'), password: 'wrongPass1' });
  record(
    'login incorrecto falla genérico',
    badLogin.status === 400 || badLogin.json.ok === false,
    String(badLogin.json.error ?? badLogin.json.data?.error)
  );

  const ghostLogin = await req('/auth/login', { phone: '79999999', password: QA_PASSWORD });
  record(
    'usuario inexistente falla genérico',
    ghostLogin.status === 400 || ghostLogin.json.ok === false
  );

  const pPhone = uniquePhone('72');
  const regP = await registerPassenger(pPhone);
  record('PASSENGER registro + password', regP.json.ok === true, String(regP.json.error));

  const pToken = await loginWithPassword(req, pPhone);
  record('PASSENGER login password (inmediato)', Boolean(pToken));

  const reloginLocal = await req('/auth/login', { phone: pPhone.slice(-8), password: QA_PASSWORD });
  record(
    'PASSENGER re-login 8 dígitos locales',
    reloginLocal.json.ok === true,
    String(reloginLocal.json.error)
  );

  const relogin503 = await req('/auth/login', { phone: `503${pPhone.slice(-8)}`, password: QA_PASSWORD });
  record(
    'PASSENGER re-login prefijo 503',
    relogin503.json.ok === true,
    String(relogin503.json.error)
  );

  const reloginE164 = await req('/auth/login', {
    phone: `+503${pPhone.slice(-8)}`,
    password: QA_PASSWORD,
  });
  record(
    'PASSENGER re-login E.164 +503',
    reloginE164.json.ok === true,
    String(reloginE164.json.error)
  );

  const wrongPwd = await req('/auth/login', { phone: pPhone, password: 'WrongPass9' });
  record(
    'PASSENGER contraseña incorrecta FAIL',
    wrongPwd.json.ok === false &&
      String(wrongPwd.json.error).includes('Teléfono o contraseña incorrectos'),
    String(wrongPwd.json.error)
  );

  const regP2 = uniquePhone('71');
  await req('/auth/request-otp', { phone: regP2 });
  await req('/auth/verify-otp', { phone: regP2, code: OTP });
  await req('/passengers/register', {
    phone: regP2,
    fullName: 'QA Auth Hash Check',
    password: QA_PASSWORD,
  });
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const dbUser = await prisma.user.findUnique({
    where: { phoneNumber: `+503${regP2.slice(-8)}` },
    select: { passwordHash: true, passwordSetAt: true },
  });
  await prisma.$disconnect();
  record(
    'Registro guarda passwordHash + passwordSetAt',
    Boolean(dbUser?.passwordHash && dbUser?.passwordSetAt),
    dbUser ? `hash=${Boolean(dbUser.passwordHash)} setAt=${Boolean(dbUser.passwordSetAt)}` : 'user missing'
  );

  const pToken2 = await loginWithPassword(req, regP2);
  record('PASSENGER login tras registro (simula logout)', Boolean(pToken2));

  const oPhone = uniquePhone('73');
  await req('/auth/request-otp', { phone: oPhone });
  await req('/auth/verify-otp', { phone: oPhone, code: OTP });
  const ownerDui = `${String(Date.now()).slice(-8)}-1`;
  const regO = await req('/owners/register', ownerRegisterPayload(oPhone, ownerDui));
  record('OWNER registro + password', regO.json.ok === true, String(regO.json.error));
  record('OWNER login password', Boolean(await loginWithPassword(req, oPhone)));

  const bPhone = uniquePhone('74');
  await req('/auth/request-otp', { phone: bPhone });
  await req('/auth/verify-otp', { phone: bPhone, code: OTP });
  const regB = await req('/businesses/register', {
    phone: bPhone,
    fullName: 'QA Business Auth',
    dui: `${String(Date.now()).slice(-8)}-2`,
    businessName: 'QA Biz Auth',
    businessType: 'restaurant',
    businessPhone: bPhone,
    latitude: 13.69,
    longitude: -89.21,
    addressLabel: 'Centro',
    password: QA_PASSWORD,
  });
  record('BUSINESS registro + password', regB.json.ok === true, String(regB.json.error));
  record('BUSINESS login password', Boolean(await loginWithPassword(req, bPhone)));

  const forgot = await req('/auth/forgot-password', { phone: pPhone });
  record('forgot-password envía OTP', forgot.json.ok === true || forgot.status === 201);

  await req('/auth/request-otp', { phone: pPhone });
  const reset = await req('/auth/reset-password', {
    phone: pPhone,
    code: OTP,
    password: 'NewPass123',
    confirmPassword: 'NewPass123',
  });
  record('reset-password con OTP', reset.json.ok === true, String(reset.json.error));
  record('login con nueva password', Boolean(await loginWithPassword(req, pPhone, 'NewPass123')));

  const adminToken = await loginAsSuperAdmin();
  record('SUPER_ADMIN OTP login (sin password)', Boolean(adminToken));

  const adminPwdAttempt = await req('/auth/login', {
    phone: process.env.ADMIN_QA_PHONE ?? '2144698637',
    password: QA_PASSWORD,
  });
  record(
    'SUPER_ADMIN rechaza login password',
    adminPwdAttempt.status === 400 || adminPwdAttempt.json.ok === false
  );

  for (let i = 0; i < 6; i += 1) {
    await req('/auth/login', { phone: pPhone, password: 'badPass1' });
  }
  const locked = await req('/auth/login', { phone: pPhone, password: 'badPass1' });
  record(
    'rate limiting tras intentos fallidos',
    locked.status === 400 &&
      String(locked.json.error ?? locked.json.data?.error).includes('Demasiados intentos')
  );

  console.log('\n=== RESUMEN AUTH QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
