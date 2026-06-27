import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_KEYS } from './authService';
import { getApiUrl } from './api/config';

export type UploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: File;
};

export type NativeFormFile = {
  uri: string;
  name: string;
  type: string;
};

export function inferMimeType(uri: string, fallback?: string | null): string {
  if (fallback && fallback.trim()) return fallback;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export function inferFileName(uri: string, provided?: string | null): string {
  if (provided && provided.trim()) return provided;
  const clean = uri.split('?')[0];
  const last = clean.split('/').pop();
  if (last && last.includes('.')) return last;
  const ext =
    clean.toLowerCase().endsWith('.png') ? 'png' :
    clean.toLowerCase().endsWith('.heic') ? 'heic' :
    clean.toLowerCase().endsWith('.webp') ? 'webp' :
    'jpg';
  return `upload-${Date.now()}.${ext}`;
}

export async function sendUploadRequest(
  fileValue: File | NativeFormFile,
  uri: string,
  resolvedName: string,
  resolvedType: string,
  documentType?: string,
  options?: { directWebFile?: boolean }
): Promise<string> {
  const token = await AsyncStorage.getItem(SESSION_KEYS.authToken);
  const apiBase = getApiUrl().replace(/\/$/, '');

  const formData = new FormData();
  formData.append('file', fileValue as any);
  if (documentType) {
    formData.append('documentType', documentType);
  }

  const res = await fetch(`${apiBase}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    },
    body: formData,
  });

  const rawText = await res.text();

  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`UPLOAD_BAD_RESPONSE_${res.status}::${rawText}`);
  }

  if (!res.ok) {
    throw new Error(
      json?.error || json?.message || json?.data?.error || `UPLOAD_HTTP_${res.status}`
    );
  }

  const url =
    json?.data?.url ??
    json?.url ??
    json?.data?.fileUrl ??
    json?.fileUrl ??
    json?.data?.data?.url ??
    json?.data?.data?.fileUrl;

  if (!url) {
    const shapeHint = json
      ? {
          topLevelKeys: Object.keys(json as object),
          dataKeys:
            json?.data && typeof json.data === 'object'
              ? Object.keys(json.data as object)
              : null,
          nestedDataKeys:
            json?.data?.data && typeof json.data.data === 'object'
              ? Object.keys(json.data.data as object)
              : null,
        }
      : null;
    console.log('[UPLOAD_RESPONSE_DEBUG]', {
      status: res.status,
      shapeHint,
    });
    throw new Error(json?.error || json?.message || 'UPLOAD_NO_URL_RETURNED');
  }

  return url as string;
}
