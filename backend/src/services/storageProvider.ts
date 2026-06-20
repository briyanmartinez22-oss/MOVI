import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  env,
  getResolvedStorageMode,
  isCloudinaryConfigured,
  isS3Configured,
} from '../config/env';
import { uploadToCloudinary } from './cloudinary.service';

export type StorageProviderMode = 'local' | 's3' | 'cloudinary';

export type StorageUploadResult = {
  url: string;
  key: string;
  mimeType: string;
  size: number;
  provider: StorageProviderMode;
};

export interface StorageProvider {
  mode: StorageProviderMode;
  uploadFile(buffer: Buffer, filename: string, mimeType: string): Promise<StorageUploadResult>;
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
    async uploadFile(buffer, filename, mimeType) {
      await ensureUploadsDir();
      const storedName = buildStoredName(sanitizeFilename(filename));
      const filePath = path.join(uploadsDir, storedName);
      await fs.writeFile(filePath, buffer);
      const base = env.publicUrl?.replace(/\/$/, '') ?? '';
      const url = base ? `${base}/uploads/${storedName}` : `/uploads/${storedName}`;
      return {
        url,
        key: storedName,
        mimeType,
        size: buffer.length,
        provider: 'local',
      };
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

      let url: string;
      if (env.awsS3PublicUrlPrefix) {
        url = `${env.awsS3PublicUrlPrefix.replace(/\/$/, '')}/${key}`;
      } else {
        url = `https://${env.awsS3Bucket}.s3.${env.awsRegion}.amazonaws.com/${key}`;
      }

      return { url, key, mimeType, size: buffer.length, provider: 's3' };
    },
  };
}

async function createCloudinaryProvider(): Promise<StorageProvider> {
  return {
    mode: 'cloudinary',
    async uploadFile(buffer, filename, mimeType) {
      const uploaded = await uploadToCloudinary(buffer, filename, mimeType);
      return {
        url: uploaded.url,
        key: uploaded.key,
        mimeType,
        size: uploaded.size,
        provider: 'cloudinary',
      };
    },
  };
}

let cachedProvider: StorageProvider | null = null;

export async function getStorageProvider(): Promise<StorageProvider> {
  if (cachedProvider) return cachedProvider;

  const mode = getResolvedStorageMode();

  if (mode === 'cloudinary' && isCloudinaryConfigured()) {
    cachedProvider = await createCloudinaryProvider();
    console.log('Storage provider: Cloudinary');
  } else if (mode === 's3' && isS3Configured()) {
    cachedProvider = await createS3Provider();
    console.log('Storage provider: S3');
  } else {
    if (env.storageProvider !== 'local' && env.nodeEnv !== 'test') {
      console.warn(
        `Storage provider: local fallback (requested ${env.storageProvider}, credentials missing)`
      );
    } else {
      console.log('Storage provider: local (uploads/)');
    }
    cachedProvider = createLocalProvider();
  }

  return cachedProvider;
}

export function getUploadsDir(): string {
  return uploadsDir;
}

/** @deprecated use StorageUploadResult.url */
export async function uploadFileLegacy(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const provider = await getStorageProvider();
  const result = await provider.uploadFile(buffer, filename, mimeType);
  return result.url;
}
