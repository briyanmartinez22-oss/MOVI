import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_KEYS } from './authService';
import { getApiUrl } from './api/config';

export type UploadFailureStage =
  | 'permissions'
  | 'picker'
  | 'file'
  | 'api'
  | 'storage'
  | 'unknown';

export type UploadSource = 'library' | 'camera';

export type UploadFileResponse = {
  url: string;
  provider?: string;
  storageKey?: string;
  mimeType?: string;
  size?: number;
  endpoint: '/uploads' | '/uploads/public';
};

export type PickAndUploadResult = UploadFileResponse & {
  localUri: string;
  fileName: string;
  source: UploadSource;
};

type UploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

type UploadPayload = {
  uri: string;
  fileName: string;
  mimeType: string;
  documentType?: string;
};

export class UploadDocumentError extends Error {
  stage: UploadFailureStage;
  details?: Record<string, unknown>;

  constructor(stage: UploadFailureStage, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'UploadDocumentError';
    this.stage = stage;
    this.details = details;
  }
}

function logUpload(stage: string, details?: unknown) {
  if (details === undefined) {
    console.log(`[uploadService] ${stage}`);
    return;
  }
  console.log(`[uploadService] ${stage}`, details);
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic') return 'heic';
  if (mimeType === 'image/heif') return 'heif';
  return 'jpg';
}

function buildFileName(input: { explicit?: string; uri?: string; mimeType: string }) {
  if (input.explicit?.trim()) return input.explicit.trim();
  if (input.uri) {
    const fromUri = input.uri.split('/').pop()?.split('?')[0];
    if (fromUri && fromUri.includes('.')) return fromUri;
  }
  return `upload-${Date.now()}.${extensionFromMimeType(input.mimeType)}`;
}

function parseUploadResponseBody(raw: string): Record<string, unknown> | null {
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readErrorMessage(body: Record<string, unknown> | null, status: number): string {
  if (body) {
    if (typeof body.error === 'string' && body.error.trim()) return body.error;
    const data = body.data;
    if (data && typeof data === 'object') {
      const apiData = data as { error?: unknown; message?: unknown };
      if (typeof apiData.error === 'string' && apiData.error.trim()) return apiData.error;
      if (typeof apiData.message === 'string' && apiData.message.trim()) return apiData.message;
    }
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
  }
  return `Error de API al subir archivo (HTTP ${status})`;
}

function resolveResponseData(body: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!body) return null;
  if ('ok' in body) {
    const wrapped = body as { ok?: unknown; data?: unknown };
    if (wrapped.ok === false) return null;
    if (wrapped.data && typeof wrapped.data === 'object') {
      return wrapped.data as Record<string, unknown>;
    }
  }
  return body;
}

async function uploadPayload(payload: UploadPayload): Promise<UploadFileResponse> {
  const token = await AsyncStorage.getItem(SESSION_KEYS.authToken);
  const endpoint: '/uploads' | '/uploads/public' = token ? '/uploads' : '/uploads/public';
  const formData = new FormData();
  formData.append('file', {
    uri: payload.uri,
    type: payload.mimeType,
    name: payload.fileName,
  } as unknown as Blob);
  if (payload.documentType) {
    formData.append('documentType', payload.documentType);
  }

  const url = `${getApiUrl().replace(/\/$/, '')}${endpoint}`;
  logUpload('sending-request', {
    endpoint,
    documentType: payload.documentType ?? null,
    hasToken: Boolean(token),
    mimeType: payload.mimeType,
    fileName: payload.fileName,
  });

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    });
  } catch (error) {
    console.error('[uploadService] network-error', error);
    throw new UploadDocumentError('api', 'No se pudo conectar con el servidor de subida', {
      endpoint,
      cause: error instanceof Error ? error.message : String(error),
    });
  }

  const rawBody = await response.text();
  const body = parseUploadResponseBody(rawBody);
  if (!response.ok) {
    const apiError = readErrorMessage(body, response.status);
    console.error('[uploadService] api-error', {
      status: response.status,
      endpoint,
      apiError,
      body: body ?? rawBody,
    });
    throw new UploadDocumentError('api', apiError, {
      status: response.status,
      endpoint,
      body: body ?? rawBody,
    });
  }

  const data = resolveResponseData(body);
  const uploadedUrl = data?.url;
  if (typeof uploadedUrl !== 'string' || !uploadedUrl.trim()) {
    console.error('[uploadService] storage-error', { endpoint, body: body ?? rawBody });
    throw new UploadDocumentError(
      'storage',
      'La API respondió sin URL del archivo subido',
      { endpoint, body: body ?? rawBody }
    );
  }

  const provider = typeof data?.provider === 'string' ? data.provider : undefined;
  const storageKey = typeof data?.storageKey === 'string' ? data.storageKey : undefined;
  const mimeType = typeof data?.mimeType === 'string' ? data.mimeType : undefined;
  const size = typeof data?.size === 'number' ? data.size : undefined;
  logUpload('upload-success', { endpoint, provider: provider ?? 'unknown', storageKey });

  return {
    url: uploadedUrl,
    provider,
    storageKey,
    mimeType,
    size,
    endpoint,
  };
}

async function ensureMediaLibraryPermission(imagePicker: typeof import('expo-image-picker')) {
  const current = await imagePicker.getMediaLibraryPermissionsAsync();
  if (current.granted) {
    logUpload('permissions-media', { status: current.status, accessPrivileges: current.accessPrivileges });
    return;
  }
  const requested = await imagePicker.requestMediaLibraryPermissionsAsync();
  logUpload('permissions-media-requested', {
    status: requested.status,
    granted: requested.granted,
    canAskAgain: requested.canAskAgain,
    accessPrivileges: requested.accessPrivileges,
  });
  if (!requested.granted) {
    throw new UploadDocumentError(
      'permissions',
      'Permiso de galería denegado. Actívalo en ajustes para seleccionar imágenes.',
      {
        status: requested.status,
        canAskAgain: requested.canAskAgain,
        accessPrivileges: requested.accessPrivileges,
      }
    );
  }
}

async function ensureCameraPermission(imagePicker: typeof import('expo-image-picker')) {
  const current = await imagePicker.getCameraPermissionsAsync();
  if (current.granted) {
    logUpload('permissions-camera', { status: current.status });
    return;
  }
  const requested = await imagePicker.requestCameraPermissionsAsync();
  logUpload('permissions-camera-requested', {
    status: requested.status,
    granted: requested.granted,
    canAskAgain: requested.canAskAgain,
  });
  if (!requested.granted) {
    throw new UploadDocumentError(
      'permissions',
      'Permiso de cámara denegado. Actívalo en ajustes para tomar la foto.',
      { status: requested.status, canAskAgain: requested.canAskAgain }
    );
  }
}

function normalizeAsset(asset: UploadAsset | undefined): UploadAsset {
  if (!asset?.uri?.trim()) {
    throw new UploadDocumentError('picker', 'No se pudo obtener la URI de la imagen seleccionada');
  }
  const mimeType = asset.mimeType?.trim() || 'image/jpeg';
  return {
    uri: asset.uri,
    mimeType,
    fileName: buildFileName({ explicit: asset.fileName ?? undefined, uri: asset.uri, mimeType }),
  };
}

export async function uploadFile(
  uri: string,
  fileName?: string,
  documentType?: string
): Promise<string> {
  const normalizedMime = 'image/jpeg';
  const normalizedFileName = buildFileName({ explicit: fileName, uri, mimeType: normalizedMime });
  const uploaded = await uploadPayload({
    uri,
    fileName: normalizedFileName,
    mimeType: normalizedMime,
    documentType,
  });
  return uploaded.url;
}

export function getUploadErrorMessage(error: unknown): string {
  if (error instanceof UploadDocumentError) return error.message;
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Error desconocido al subir archivo';
}

export async function pickAndUploadDocumentDetailed(options?: {
  documentType?: string;
  source?: UploadSource;
  quality?: number;
}): Promise<PickAndUploadResult | null> {
  const documentType = options?.documentType;
  const source = options?.source ?? 'library';
  const quality = options?.quality ?? 0.85;

  logUpload('pick-start', { source, documentType: documentType ?? null });

  try {
    const ImagePicker = await import('expo-image-picker');
    if (source === 'camera') {
      await ensureCameraPermission(ImagePicker);
    } else {
      await ensureMediaLibraryPermission(ImagePicker);
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality,
            allowsEditing: false,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality,
            allowsEditing: false,
            selectionLimit: 1,
          });

    if (result.canceled) {
      logUpload('pick-cancelled', { source });
      return null;
    }
    const normalizedAsset = normalizeAsset(result.assets[0]);
    const upload = await uploadPayload({
      uri: normalizedAsset.uri,
      mimeType: normalizedAsset.mimeType ?? 'image/jpeg',
      fileName: normalizedAsset.fileName ?? buildFileName({ uri: normalizedAsset.uri, mimeType: 'image/jpeg' }),
      documentType,
    });
    return {
      ...upload,
      source,
      localUri: normalizedAsset.uri,
      fileName: normalizedAsset.fileName ?? buildFileName({ uri: normalizedAsset.uri, mimeType: 'image/jpeg' }),
    };
  } catch (error) {
    if (error instanceof UploadDocumentError) {
      console.error('[uploadService] staged-error', {
        stage: error.stage,
        message: error.message,
        details: error.details,
      });
      throw error;
    }
    console.error('[uploadService] unexpected-error', error);
    throw new UploadDocumentError(
      'unknown',
      error instanceof Error ? error.message : 'Error desconocido en la subida',
      { cause: error instanceof Error ? error.stack : String(error) }
    );
  }
}

export async function pickAndUploadDocument(documentType?: string): Promise<string | null> {
  const result = await pickAndUploadDocumentDetailed({
    documentType,
    source: 'library',
  });
  return result?.url ?? null;
}
