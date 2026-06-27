import * as ImagePicker from 'expo-image-picker';
import {
  inferFileName,
  inferMimeType,
  sendUploadRequest,
  type NativeFormFile,
  type UploadAsset,
} from './uploadService.shared';

export async function uploadFile(
  uri: string,
  fileName?: string,
  documentType?: string,
  mimeType?: string,
  _webFile?: File
): Promise<string> {
  void _webFile;
  const resolvedName = inferFileName(uri, fileName);
  const resolvedType = inferMimeType(uri, mimeType);
  const fileValue: NativeFormFile = {
    uri,
    name: resolvedName,
    type: resolvedType,
  };

  return sendUploadRequest(fileValue, uri, resolvedName, resolvedType, documentType);
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
      fileName: (asset as { fileName?: string | null }).fileName ?? null,
      mimeType: (asset as { mimeType?: string | null }).mimeType ?? null,
    },
    documentType
  );
}
