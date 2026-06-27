import { AuthUser } from '../types/models';
import { getApiUrl } from '../services/api/config';

/** Resolve stored profile photo paths to a fetchable absolute URL for Image. */
export function resolveProfilePhotoUrl(url?: string | null): string | undefined {
  const trimmed = url?.trim();
  if (!trimmed) return undefined;
  if (/^(https?:|data:|blob:|file:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  const base = getApiUrl().replace(/\/$/, '');
  if (!base) return trimmed;
  return trimmed.startsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

export function readAuthUserProfilePhoto(user?: AuthUser | null): string | undefined {
  return resolveProfilePhotoUrl(user?.profilePhoto);
}

export function extractAuthUserFromApiPayload(data: unknown): AuthUser | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;
  if (typeof record.userId === 'string') return data as AuthUser;

  const nestedUser = record.user;
  if (nestedUser && typeof nestedUser === 'object' && typeof (nestedUser as AuthUser).userId === 'string') {
    return nestedUser as AuthUser;
  }

  const nestedData = record.data;
  if (nestedData && typeof nestedData === 'object') {
    return extractAuthUserFromApiPayload(nestedData);
  }

  return null;
}
