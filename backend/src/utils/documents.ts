import type { Request } from 'express';
import { getStorageProvider } from '../services/storageProvider';

type DocFields = Record<string, unknown>;

const BASE64_DATA_URL = /^data:[^;]+;base64,/i;

function isBase64DataUrl(value: unknown): value is string {
  return typeof value === 'string' && BASE64_DATA_URL.test(value);
}

export function parseJsonBodyDocs(body: unknown): DocFields {
  if (!body || typeof body !== 'object') return {};
  const docs = body as DocFields;
  for (const [key, value] of Object.entries(docs)) {
    if (isBase64DataUrl(value)) {
      throw new Error(
        `Campo "${key}": no se acepta base64. Sube el archivo con POST /uploads y envía la URL pública.`
      );
    }
  }
  return docs;
}

export async function parseMultipartOrJsonDocs(req: Request): Promise<DocFields> {
  const files = req.files as Express.Multer.File[] | undefined;
  const file = req.file as Express.Multer.File | undefined;
  const allFiles = files?.length ? files : file ? [file] : [];

  const docs: DocFields = { ...parseJsonBodyDocs(req.body) };

  if (allFiles.length > 0) {
    const storage = await getStorageProvider();
    for (const uploaded of allFiles) {
      const fieldName = uploaded.fieldname || 'file';
      const result = await storage.uploadFile(
        uploaded.buffer,
        uploaded.originalname,
        uploaded.mimetype
      );
      docs[fieldName] = result.url;
    }
  }

  for (const [key, value] of Object.entries(docs)) {
    if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
      try {
        docs[key] = JSON.parse(value);
      } catch {
        // keep as string
      }
    }
  }

  return docs;
}
