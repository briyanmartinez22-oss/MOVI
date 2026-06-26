import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { SESSION_KEYS } from './authService';
import { getApiUrl } from './api/config';

type UploadAsset = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  file?: File;
};

type NativeFormFile = {
  uri: string;
  name: string;
  type: string;
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

async function pickWebFile(): Promise<{ file: File; uri: string; fileName: string; mimeType: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const uri = URL.createObjectURL(file);
      resolve({
        file,
        uri,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
      });
    };
    input.click();
  });
}

async function buildWebFile(uri: string, fileName: string, mimeType: string): Promise<File> {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(`WEB_FILE_FETCH_${response.status}`);
  }
  const blob = await response.blob();
  return new File([blob], fileName, { type: mimeType });
}

async function buildFormFile(
  uri: string,
  fileName: string,
  mimeType: string,
  webFile?: File
): Promise<File | NativeFormFile> {
  if (webFile) {
    return webFile;
  }
  if (Platform.OS === 'web') {
    return buildWebFile(uri, fileName, mimeType);
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
  mimeType?: string,
  webFile?: File
): Promise<string> {
  const token = await AsyncStorage.getItem(SESSION_KEYS.authToken);
  const resolvedName = inferFileName(uri, fileName);
  const resolvedType = inferMimeType(uri, mimeType);
  const apiBase = getApiUrl().replace(/\/$/, '');

  const fileValue = await buildFormFile(uri, resolvedName, resolvedType, webFile);

  const formData = new FormData();
  formData.append('file', fileValue as any);
  if (documentType) {
    formData.append('documentType', documentType);
  }

  console.log('[UPLOAD] starting', {
    platform: Platform.OS,
    uri,
    resolvedName,
    resolvedType,
    documentType,
    apiBase,
    hasToken: Boolean(token),
    directWebFile: Boolean(webFile),
  });

  const res = await fetch(`${apiBase}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
      Accept: 'application/json',
    },
    body: formData,
  });

  const rawText = await res.text();
  console.log('[UPLOAD] response status', res.status);
  console.log('[UPLOAD] response body', rawText);

  let json: any = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    throw new Error(`UPLOAD_BAD_RESPONSE_${res.status}::${rawText}`);
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
    inferMimeType(asset.uri, asset.mimeType),
    asset.file
  );
}

export async function pickAndUploadDocument(documentType?: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    const picked = await pickWebFile();
    console.log('[UPLOAD] web picker result', picked ? { fileName: picked.fileName, mimeType: picked.mimeType } : null);
    if (!picked) {
      return null;
    }

    try {
      return await uploadFile(
        picked.uri,
        picked.fileName,
        documentType,
        picked.mimeType,
        picked.file
      );
    } finally {
      URL.revokeObjectURL(picked.uri);
    }
  }

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

  console.log('[UPLOAD] picker result', result);

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
