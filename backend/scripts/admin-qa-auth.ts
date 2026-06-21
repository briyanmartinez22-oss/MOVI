/**
 * Auth helper para scripts QA admin — usa SuperAdmin real por defecto.
 * En modo demo (OTP_PROVIDER=demo), el código es el del proveedor demo (consola).
 * En producción requiere Twilio Verify real.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

export const ADMIN_QA_PHONE = process.env.ADMIN_QA_PHONE ?? '2144698637';
export const ADMIN_QA_DUI = process.env.ADMIN_QA_DUI ?? '00000000-0';

const TOKEN_CACHE = join(tmpdir(), 'movi-qa-admin-token.json');
const TOKEN_TTL_MS = 4 * 60 * 1000;

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

function readCachedToken(): string | null {
  if (process.env.ADMIN_QA_TOKEN) return process.env.ADMIN_QA_TOKEN;
  try {
    const raw = readFileSync(TOKEN_CACHE, 'utf8');
    const parsed = JSON.parse(raw) as { token: string; api: string; expiresAt: number };
    if (parsed.api === API && parsed.expiresAt > Date.now()) return parsed.token;
  } catch {
    /* no cache */
  }
  return null;
}

function writeCachedToken(token: string) {
  try {
    mkdirSync(tmpdir(), { recursive: true });
    writeFileSync(
      TOKEN_CACHE,
      JSON.stringify({ token, api: API, expiresAt: Date.now() + TOKEN_TTL_MS }),
      'utf8'
    );
  } catch {
    /* ignore cache write errors */
  }
}

export async function loginAsSuperAdmin(): Promise<string> {
  const cached = readCachedToken();
  if (cached) {
    const me = await req('/admin/me', undefined, cached);
    if (me.status === 200 && me.json.data?.staffRole === 'SUPER_ADMIN') return cached;
  }

  await req('/auth/request-otp', { phone: ADMIN_QA_PHONE });
  await req('/auth/verify-otp', { phone: ADMIN_QA_PHONE, code: OTP });
  const login = await req('/auth/login', {
    phone: ADMIN_QA_PHONE,
    dui: ADMIN_QA_DUI,
    code: OTP,
  });
  if (!login.json.ok) throw new Error(`SuperAdmin login failed: ${login.json.error}`);
  const token = login.json.data.authToken as string;
  writeCachedToken(token);
  return token;
}

export { req, API, OTP };
