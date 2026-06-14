import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env, isS3Configured } from '../config/env';

export interface StorageProvider {
  uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<string>;
  mode: 'local' | 's3';
}

const backendRoot = path.resolve(__dirname, '../..');
const uploadsDir = path.join(backendRoot, 'uploads');

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

function sanitizeFilename(filename: string): string {
  const base = path.basename(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  return base || 'file';
}

function buildStoredName(filename: string): string {
  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  return `${stem}-${randomUUID().slice(0, 8)}${ext}`;
}

function createLocalProvider(): StorageProvider {
  return {
    mode: 'local',
    async uploadFile(buffer, filename, _mimeType) {
      await ensureUploadsDir();
      const storedName = buildStoredName(sanitizeFilename(filename));
      const filePath = path.join(uploadsDir, storedName);
      await fs.writeFile(filePath, buffer);
      return `/uploads/${storedName}`;
    },
  };
}

async function createS3Provider(): Promise<StorageProvider> {
  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
  const client = new S3Client({
    region: env.awsRegion,
    credentials: {
      accessKeyId: env.awsAccessKeyId!,
      secretAccessKey: env.awsSecretAccessKey!,
    },
  });

  return {
    mode: 's3',
    async uploadFile(buffer, filename, mimeType) {
      const key = buildStoredName(sanitizeFilename(filename));
      await client.send(
        new PutObjectCommand({
          Bucket: env.awsS3Bucket!,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
        })
      );

      if (env.awsS3PublicUrlPrefix) {
        return `${env.awsS3PublicUrlPrefix.replace(/\/$/, '')}/${key}`;
      }
      return `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
    },
  };
}

let cachedProvider: StorageProvider | null = null;

export async function getStorageProvider(): Promise<StorageProvider> {
  if (cachedProvider) return cachedProvider;

  if (isS3Configured()) {
    cachedProvider = await createS3Provider();
    console.log('Storage provider: S3');
  } else {
    cachedProvider = createLocalProvider();
    console.log('Storage provider: local (uploads/)');
  }

  return cachedProvider;
}

export function getUploadsDir(): string {
  return uploadsDir;
}
