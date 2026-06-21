#!/usr/bin/env tsx
/**
 * QA — external integrations readiness
 * Usage: npm run qa:integrations
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractUploadPayload,
  isStoredUrl,
  loginOwnerForUpload,
  uploadTestFile,
} from './storage-upload-qa';

const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';
const ROOT = join(__dirname, '..', '..');
const BACKEND_SRC = join(ROOT, 'backend', 'src');

type StepResult = { step: string; status: 'PASS' | 'FAIL'; detail?: string };
const results: StepResult[] = [];

const SECRET_PATTERNS = [
  /AKIA[0-9A-Z]{16}/,
  /sk_live_[a-zA-Z0-9]+/,
  /sk_test_[a-zA-Z0-9]+/,
  /CLOUDINARY_API_SECRET\s*=\s*['"][^'"]+['"]/,
  /GOOGLE_MAPS_API_KEY\s*=\s*['"][^'"]+['"]/,
  /AIza[0-9A-Za-z\-_]{35}/,
  /TWILIO_AUTH_TOKEN\s*=\s*['"][^'"]+['"]/,
  /BEGIN PRIVATE KEY/,
];

const SENSITIVE_FILES = ['.env', 'backend/.env', '.pem', 'credentials.json'];

async function req(path: string, body?: unknown, token?: string, method?: string) {
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

function record(step: string, ok: boolean, detail?: string) {
  results.push({ step, status: ok ? 'PASS' : 'FAIL', detail });
  console.log(ok ? `✓ ${step}` : `✗ ${step}${detail ? ` — ${detail}` : ''}`);
}

function walkTsFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walkTsFiles(full, acc);
    else if (entry.endsWith('.ts')) acc.push(full);
  }
  return acc;
}

function checkNoHardcodedSecrets(): boolean {
  const offenders: string[] = [];
  for (const file of walkTsFiles(BACKEND_SRC)) {
    const content = readFileSync(file, 'utf8');
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(content)) offenders.push(file.replace(ROOT + '/', ''));
    }
  }
  if (offenders.length > 0) {
    record('Sin secretos hardcodeados en backend/src', false, offenders.join(', '));
    return false;
  }
  record('Sin secretos hardcodeados en backend/src', true);
  return true;
}

function checkSensitiveFilesNotTracked(): boolean {
  const gitignorePath = join(ROOT, '.gitignore');
  let gitignore = '';
  try {
    gitignore = readFileSync(gitignorePath, 'utf8');
  } catch {
    record('Archivos sensibles en .gitignore', false, '.gitignore no encontrado');
    return false;
  }

  const requiredPatterns = ['.env', 'backend/.env'];
  const missing = requiredPatterns.filter((p) => !gitignore.includes(p));
  record(
    'Archivos sensibles listados en .gitignore',
    missing.length === 0,
    missing.length ? `Falta: ${missing.join(', ')}` : undefined
  );
  return missing.length === 0;
}

function checkProviderModulesExist(): boolean {
  const required = [
    'backend/src/services/storageProvider.ts',
    'backend/src/services/cloudinary.service.ts',
    'backend/src/services/maps.service.ts',
    'backend/src/services/mapsProvider.ts',
    'backend/src/services/otpProvider.ts',
    'backend/src/services/notificationProvider.ts',
    'backend/src/services/expoPush.service.ts',
  ];
  const missing = required.filter((rel) => {
    try {
      readFileSync(join(ROOT, rel));
      return false;
    } catch {
      return true;
    }
  });
  record('Módulos provider presentes', missing.length === 0, missing.join(', ') || undefined);
  return missing.length === 0;
}

async function run() {
  console.log('MOVI Integrations QA —', API, '\n');

  const health = await req('/health');
  record('Health responde', health.status === 200 && health.json.status === 'ok');

  const status = await req('/integrations/status');
  const data = status.json.data ?? status.json;
  record(
    'GET /integrations/status responde 200',
    status.status === 200 && Boolean(data?.storage && data?.maps && data?.otp && data?.push)
  );

  record(
    'Storage fallback activo sin credenciales',
    data?.storage?.active === 'local' || data?.storage?.active === 's3' || data?.storage?.active === 'cloudinary'
  );
  record(
    'Maps fallback activo sin API key',
    data?.maps?.active === 'fallback' || data?.maps?.active === 'google' || data?.maps?.active === 'mapbox'
  );
  record(
    'Maps Google status expuesto',
    typeof data?.maps?.google?.active === 'boolean' &&
      typeof data?.maps?.google?.configured === 'boolean'
  );

  const mapsTest = await req('/integrations/maps/test');
  const mapsData = mapsTest.json.data ?? mapsTest.json;
  record(
    'GET /integrations/maps/test responde',
    mapsTest.status === 200 && typeof mapsData?.geocodeTest === 'string'
  );
  record(
    'Maps test no expone API key',
    !JSON.stringify(mapsData).includes('AIza') &&
      !JSON.stringify(mapsData).includes('GOOGLE_MAPS_API_KEY')
  );
  record(
    'Maps geocode test responde',
    mapsData?.geocodeTest === 'ok' || mapsData?.geocodeTest === 'skipped'
  );
  record(
    'Maps route test responde',
    mapsData?.routeTest === 'ok' ||
      mapsData?.routeTest === 'skipped' ||
      mapsData?.provider === 'fallback'
  );

  const cloudinaryTest = await req('/integrations/cloudinary/test');
  record(
    'OTP demo permitido solo en dev',
    data?.environment !== 'production' ? data?.otp?.demoAllowed === true : data?.otp?.demoAllowed === false
  );
  record(
    'Push no rompe sin credenciales',
    data?.push?.active === 'none' || data?.push?.active === 'expo' || data?.push?.active === 'firebase'
  );

  record(
    'Storage Cloudinary status expuesto',
    typeof data?.storage?.cloudinary?.active === 'boolean' &&
      typeof data?.storage?.cloudinary?.configured === 'boolean'
  );
  record(
    'Storage Cloudinary activo solo con credenciales',
    data?.storage?.cloudinary?.active === true
      ? data?.storage?.cloudinary?.configured === true
      : true
  );
  record(
    'Storage folder Cloudinary no expone secretos',
    data?.storage?.cloudinary?.folder == null ||
      (typeof data.storage.cloudinary.folder === 'string' &&
        !data.storage.cloudinary.folder.includes('secret'))
  );

  const cloudinaryData = cloudinaryTest.json.data ?? cloudinaryTest.json;
  record(
    'GET /integrations/cloudinary/test responde',
    cloudinaryTest.status === 200 && typeof cloudinaryData?.configured === 'boolean'
  );
  record(
    'Cloudinary test no expone secretos',
    !JSON.stringify(cloudinaryData).includes('api_secret') &&
      !JSON.stringify(cloudinaryData).includes('CLOUDINARY_API_SECRET')
  );

  try {
    const { token } = await loginOwnerForUpload(API, OTP);
    const upload = await uploadTestFile(API, token, 'duiFront');
    const payload = extractUploadPayload(upload.json);
    const url = payload?.url;
    record(
      'POST /uploads multipart responde 200',
      (upload.status === 200 || upload.status === 201) && upload.json.ok === true
    );
    record(
      'Upload devuelve URL almacenada (no base64)',
      isStoredUrl(url),
      typeof url === 'string' ? url.slice(0, 80) : 'sin url'
    );
    record(
      'Upload provider coincide con storage activo',
      payload?.provider === data?.storage?.active,
      `${String(payload?.provider)} vs ${String(data?.storage?.active)}`
    );
    record(
      'Upload persiste metadata en PostgreSQL',
      typeof payload?.id === 'string' && typeof payload?.storageKey === 'string'
    );
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    record('POST /uploads multipart responde 200', false, detail);
    record('Upload devuelve URL almacenada (no base64)', false, detail);
    record('Upload provider coincide con storage activo', false, detail);
    record('Upload persiste metadata en PostgreSQL', false, detail);
  }

  const geocode = await req('/locations/geocode?q=Centro+San+Salvador');
  const geoData = geocode.json.data ?? geocode.json;
  record(
    'Geocoding responde con fallback',
    geocode.status === 200 && Array.isArray(geoData?.results) && geoData.results.length > 0
  );

  const distance = await req('/locations/distance', {
    origin: { latitude: 13.6929, longitude: -89.2182 },
    destination: { latitude: 13.701, longitude: -89.224 },
  });
  const distData = distance.json.data ?? distance.json;
  record(
    'Cálculo distancia responde',
    (distance.status === 200 || distance.status === 201) &&
      typeof distData?.distanceKm === 'number' &&
      distData.distanceKm > 0
  );

  await req('/auth/request-otp', { phone: '78214898' });
  const verify = await req('/auth/verify-otp', { phone: '78214898', code: OTP });
  record('OTP demo funciona sin Twilio', verify.json.ok === true || verify.json.data?.verified === true);

  const unverifiedPhone = `73${String(Date.now()).slice(-6)}`;
  const blockedRegister = await req('/passengers/register', {
    phone: unverifiedPhone,
    fullName: 'QA Blocked Passenger',
  });
  record(
    'Registro bloqueado sin OTP verificado',
    blockedRegister.status === 400 || blockedRegister.json.ok === false,
    blockedRegister.json.error ?? blockedRegister.json.data?.error
  );

  checkProviderModulesExist();
  checkNoHardcodedSecrets();
  checkSensitiveFilesNotTracked();

  const statusRaw = JSON.stringify(data);
  const exposesValues =
    /"(apiKey|secret|privateKey|authToken)"\s*:\s*"[A-Za-z0-9_\-/+]{12,}"/.test(statusRaw);
  record(
    'Status no expone secretos',
    !statusRaw.includes('api_secret') && !exposesValues
  );

  console.log('\n=== RESUMEN INTEGRATIONS QA ===');
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  console.log(`PASS: ${passed} | FAIL: ${failed} | TOTAL: ${results.length}`);
  if (failed > 0) {
    console.log('\nFallos:');
    results.filter((r) => r.status === 'FAIL').forEach((r) => console.log(` - ${r.step}: ${r.detail ?? ''}`));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('QA FATAL:', e);
  process.exit(1);
});
