import {
  inferFileName,
  inferMimeType,
  sendUploadRequest,
  type UploadAsset,
} from './uploadService.shared';

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

export async function uploadFile(
  uri: string,
  fileName?: string,
  documentType?: string,
  mimeType?: string,
  webFile?: File
): Promise<string> {
  const resolvedName = inferFileName(uri, fileName);
  const resolvedType = inferMimeType(uri, mimeType);
  const fileValue = webFile ?? (await buildWebFile(uri, resolvedName, resolvedType));

  return sendUploadRequest(fileValue, uri, resolvedName, resolvedType, documentType, {
    directWebFile: Boolean(webFile),
  });
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
