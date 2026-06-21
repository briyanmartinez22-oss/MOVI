/**
 * Auth helper para scripts QA admin — usa SuperAdmin real por defecto.
 * En modo demo (OTP_PROVIDER=demo), el código es el del proveedor demo (consola).
 * En producción requiere Twilio Verify real.
 */
const API = process.env.API_URL ?? 'http://localhost:3001';
const OTP = process.env.DEMO_OTP_CODE ?? '123456';

export const ADMIN_QA_PHONE = process.env.ADMIN_QA_PHONE ?? '2144698637';
export const ADMIN_QA_DUI = process.env.ADMIN_QA_DUI ?? '00000000-0';

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

export async function loginAsSuperAdmin(): Promise<string> {
  await req('/auth/request-otp', { phone: ADMIN_QA_PHONE });
  await req('/auth/verify-otp', { phone: ADMIN_QA_PHONE, code: OTP });
  const login = await req('/auth/login', {
    phone: ADMIN_QA_PHONE,
    dui: ADMIN_QA_DUI,
    code: OTP,
  });
  if (!login.json.ok) throw new Error(`SuperAdmin login failed: ${login.json.error}`);
  return login.json.data.authToken as string;
}

export { req, API, OTP };
