import { AuthUser, Owner } from '../types/models';
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

export function readOwnerDocumentSelfie(owner?: Owner | null): string | undefined {
  return resolveProfilePhotoUrl(owner?.documents?.selfie);
}

export function resolveOwnerProfilePhotoUrl(input: {
  localPhotoUrl?: string | null;
  user?: AuthUser | null;
  owner?: Owner | null;
}): string | undefined {
  return (
    resolveProfilePhotoUrl(input.localPhotoUrl) ??
    readAuthUserProfilePhoto(input.user) ??
    readOwnerDocumentSelfie(input.owner)
  );
}

export function hasOwnerProfilePhoto(input: {
  localPhotoUrl?: string | null;
  user?: AuthUser | null;
  owner?: Owner | null;
}): boolean {
  const raw =
    input.localPhotoUrl?.trim() ||
    input.user?.profilePhoto?.trim() ||
    input.owner?.documents?.selfie?.trim();
  return Boolean(raw);
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
