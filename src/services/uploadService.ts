import { getApiUrl } from './api/config';

export async function uploadFile(
  uri: string,
  fileName?: string,
  documentType?: string
): Promise<string> {
  const token = await import('@react-native-async-storage/async-storage').then((m) =>
    m.default.getItem('movi_session_authToken')
  );
  const name = fileName ?? `upload-${Date.now()}.jpg`;
  const formData = new FormData();
  formData.append('file', {
    uri,
    type: 'image/jpeg',
    name,
  } as unknown as Blob);
  if (documentType) {
    formData.append('documentType', documentType);
  }

  const res = await fetch(`${getApiUrl().replace(/\/$/, '')}/uploads`, {
    method: 'POST',
    headers: {
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  });
  const json = await res.json();
  if (!json.ok || !json.data?.url) {
    throw new Error(json.error ?? 'Error al subir archivo');
  }
  return json.data.url as string;
}

export async function pickAndUploadDocument(documentType?: string): Promise<string | null> {
  try {
    const ImagePicker = await import('expo-image-picker');
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]?.uri) return null;
    return uploadFile(result.assets[0].uri, undefined, documentType);
  } catch {
    return null;
  }
}
