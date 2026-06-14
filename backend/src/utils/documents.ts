import type { Request } from 'express';
import { getStorageProvider } from '../services/storageProvider';

type DocFields = Record<string, unknown>;

export function parseJsonBodyDocs(body: unknown): DocFields {
  if (!body || typeof body !== 'object') return {};
  return body as DocFields;
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
      const url = await storage.uploadFile(
        uploaded.buffer,
        uploaded.originalname,
        uploaded.mimetype
      );
      docs[fieldName] = url;
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
