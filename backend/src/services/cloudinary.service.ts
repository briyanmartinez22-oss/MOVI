import { randomUUID, createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env, isCloudinaryConfigured } from '../config/env';

const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
  'base64'
);

let sdkConfigured = false;

function getCloudinaryClient() {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary no configurado');
  }
  if (!sdkConfigured) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true,
    });
    sdkConfigured = true;
  }
  return cloudinary;
}

function buildPublicId(filename: string): string {
  const stem = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'file';
  return `${stem}-${randomUUID().slice(0, 8)}`;
}

function uploadBuffer(
  buffer: Buffer,
  options: {
    folder: string;
    public_id: string;
    resource_type?: 'auto' | 'image' | 'raw';
  }
): Promise<UploadApiResponse> {
  const client = getCloudinaryClient();
  return new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(options, (error, result) => {
      if (error) reject(error);
      else if (!result) reject(new Error('Cloudinary upload returned empty result'));
      else resolve(result);
    });
    Readable.from(buffer).pipe(stream);
  });
}

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<{ url: string; key: string; size: number }> {
  const publicId = buildPublicId(filename);
  const result = await uploadBuffer(buffer, {
    folder: env.cloudinaryFolder,
    public_id: publicId,
    resource_type: 'auto',
  });

  return {
    url: result.secure_url,
    key: result.public_id,
    size: result.bytes ?? buffer.length,
  };
}

function formatCloudinaryError(error: unknown): string {
  if (error && typeof error === 'object') {
    const cloudinaryError = error as {
      message?: string;
      http_code?: number;
      error?: { message?: string };
    };
    if (cloudinaryError.error?.message) return cloudinaryError.error.message;
    if (cloudinaryError.message) return cloudinaryError.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Error desconocido al conectar Cloudinary';
}

async function probeCloudinaryUploadError(): Promise<string | null> {
  if (!isCloudinaryConfigured()) return null;

  const timestamp = Math.round(Date.now() / 1000);
  const publicId = `connection-probe-${timestamp}`;
  const params = {
    folder: env.cloudinaryFolder,
    public_id: publicId,
    timestamp: String(timestamp),
  };
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key as keyof typeof params]}`)
    .join('&');
  const signature = createHash('sha1')
    .update(toSign + env.cloudinaryApiSecret)
    .digest('hex');

  const form = new FormData();
  form.append('file', new Blob([TEST_PNG], { type: 'image/png' }), 'probe.png');
  form.append('api_key', env.cloudinaryApiKey!);
  form.append('timestamp', String(timestamp));
  form.append('folder', env.cloudinaryFolder);
  form.append('public_id', publicId);
  form.append('signature', signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${env.cloudinaryCloudName}/image/upload`,
    { method: 'POST', body: form }
  );
  if (res.ok) return null;

  const body = (await res.json()) as { error?: { message?: string } };
  return body.error?.message ?? `Cloudinary upload failed with HTTP ${res.status}`;
}

export type CloudinaryConnectionResult = {
  configured: boolean;
  active: boolean;
  cloudName: string | null;
  folder: string | null;
  ping: 'ok' | 'failed' | 'skipped';
  uploadTest: 'ok' | 'failed' | 'skipped';
  sampleUrl: string | null;
  error: string | null;
};

export async function verifyCloudinaryConnection(): Promise<CloudinaryConnectionResult> {
  const base: CloudinaryConnectionResult = {
    configured: isCloudinaryConfigured(),
    active: false,
    cloudName: env.cloudinaryCloudName ?? null,
    folder: isCloudinaryConfigured() ? env.cloudinaryFolder : null,
    ping: 'skipped',
    uploadTest: 'skipped',
    sampleUrl: null,
    error: null,
  };

  if (!isCloudinaryConfigured()) {
    return {
      ...base,
      error: 'Faltan CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY o CLOUDINARY_API_SECRET',
    };
  }

  try {
    const client = getCloudinaryClient();
    const pingResult = await client.api.ping();
    base.ping = pingResult?.status === 'ok' ? 'ok' : 'failed';

    const testPublicId = `connection-test-${Date.now()}`;
    const upload = await uploadBuffer(TEST_PNG, {
      folder: env.cloudinaryFolder,
      public_id: testPublicId,
      resource_type: 'auto',
    });
    base.uploadTest = 'ok';
    base.sampleUrl = upload.secure_url;
    base.active = true;

    try {
      await client.uploader.destroy(upload.public_id);
    } catch {
      // Test asset cleanup is best-effort.
    }

    return base;
  } catch (error) {
    const probeError = await probeCloudinaryUploadError().catch(() => null);
    return {
      ...base,
      ping: base.ping === 'ok' ? 'ok' : 'failed',
      uploadTest: 'failed',
      error: probeError ?? formatCloudinaryError(error),
    };
  }
}
