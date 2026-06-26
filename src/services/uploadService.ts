import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { SESSION_KEYS } from './authService';
import { getApiUrl } from './api/config';

type UploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

function inferMimeType(uri: string, fallback?: string | null): string {
  if (fallback && fallback.trim()) return fallback;
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic')) return 'image/heic';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function inferFileName(uri: string, provided?: string | null): string {
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

async function buildFormDataFile(
  uri: string,
  fileName: string,
  mimeType: string
): Promise<any> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }

  return {
    uri,
    name: fileName,
    type: mimeType,
  };
}

export async function uploadFile(
  uri: string,
  fileName?: string,
  documentType?: string,
  mimeType?: string
): Promise<string> {
  const token = await AsyncStorage.getItem(SESSION_KEYS.authToken);
  const resolvedName = inferFileName(uri, fileName);
  const resolvedType = inferMimeType(uri, mimeType);

  const fileValue = await buildFormDataFile(uri, resolvedName, resolvedType);

  const formData = new FormData();
  formData.append('file', fileValue);

  if (documentType) {
    formData.append('documentType', documentType);
  }

  const apiBase = getApiUrl().replace(/\/$/, '');
  const res = await fetch(`${apiBase}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    },
    body: formData,
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    throw new Error(`UPLOAD_BAD_RESPONSE_${res.status}`);
  }

  if (!res.ok) {
    throw new Error(json?.error || `UPLOAD_HTTP_${res.status}`);
  }

  if (!json?.ok || !json?.data?.url) {
    throw new Error(json?.error || 'UPLOAD_NO_URL_RETURNED');
  }

  return json.data.url as string;
}

export async function uploadPickedAsset(
  asset: UploadAsset,
  documentType?: string
): Promise<string> {
  return uploadFile(
    asset.uri,
    inferFileName(asset.uri, asset.fileName),
    documentType,
    inferMimeType(asset.uri, asset.mimeType)
  );
}

export async function pickAndUploadDocument(documentType?: string): Promise<string | null> {
  const ImagePicker = await import('expo-image-picker');

  const currentPerm = await ImagePicker.getMediaLibraryPermissionsAsync();
  let granted = currentPerm.granted;

  if (!granted) {
    const asked = await ImagePicker.requestMediaLibraryPermissionsAsync();
    granted = asked.granted;
  }

  if (!granted) {
    throw new Error('MEDIA_LIBRARY_PERMISSION_DENIED');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
    selectionLimit: 1,
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  const asset = result.assets[0];
  return uploadPickedAsset(
    {
      uri: asset.uri,
      fileName: (asset as any).fileName ?? null,
      mimeType: (asset as any).mimeType ?? null,
    },
    documentType
  );
}
