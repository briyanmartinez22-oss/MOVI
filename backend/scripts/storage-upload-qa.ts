/**
 * Shared storage/upload QA helpers for integration scripts.
 */
import { ownerRegisterPayload } from './qa-registration';

const MINIMAL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

export function isStoredUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url.trim()) return false;
  if (/^data:[^;]+;base64,/i.test(url)) return false;
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/uploads/');
}

export async function uploadTestFile(
  api: string,
  token: string,
  documentType = 'duiFront'
): Promise<{ status: number; json: Record<string, unknown> }> {
  const form = new FormData();
  form.append('file', new Blob([MINIMAL_PNG], { type: 'image/png' }), 'qa-dui-front.png');
  form.append('documentType', documentType);

  const res = await fetch(`${api}/uploads`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  const json = (await res.json()) as Record<string, unknown>;
  return { status: res.status, json };
}

export function extractUploadPayload(json: Record<string, unknown>): Record<string, unknown> | null {
  const data = json.data;
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return json;
}

export async function loginOwnerForUpload(
  api: string,
  otp: string
): Promise<{ token: string; ownerId: string }> {
  const phone = `79${String(Date.now()).slice(-6)}`;
  await fetch(`${api}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone }),
  });
  await fetch(`${api}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, code: otp }),
  });
  const reg = await fetch(`${api}/owners/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      ownerRegisterPayload(phone, `${String(Date.now()).slice(-8)}-0`, 'QA', 'Storage Owner')
    ),
  });
  const regJson = (await reg.json()) as {
    ok?: boolean;
    data?: { authToken?: string; owner?: { id?: string } };
  };
  const token = regJson.data?.authToken;
  const ownerId = regJson.data?.owner?.id;
  if (!token || !ownerId) {
    throw new Error('No se pudo registrar dueño para QA de storage');
  }
  return { token, ownerId };
}
