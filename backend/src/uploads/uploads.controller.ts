import {
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { mapDocumentType, uploadAndStoreDocument } from '../services/documentStorage.service';
import {
  getCachedStorageProviderMode,
  getStorageProvider,
} from '../services/storageProvider';

type UploadResponsePayload = {
  url?: string;
  fileUrl?: string;
  storageKey?: string;
  key?: string;
  mimeType?: string;
  size?: number;
  provider?: string;
  ownerId?: string | null;
  createdAt?: string;
};

function normalizeUploadResponse(payload: UploadResponsePayload) {
  const url = payload.url ?? payload.fileUrl;
  if (!url) {
    throw new HttpException(
      'La subida se completó pero no se obtuvo URL del archivo',
      HttpStatus.INTERNAL_SERVER_ERROR
    );
  }

  return {
    ok: true as const,
    data: {
      url,
      storageKey: payload.storageKey ?? payload.key,
      mimeType: payload.mimeType,
      size: payload.size,
      provider: payload.provider,
      ownerId: payload.ownerId ?? undefined,
      createdAt: payload.createdAt ?? new Date().toISOString(),
    },
  };
}

function uploadErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (!message || lower === 'undefined') {
    return 'No se pudo guardar el archivo';
  }
  if (lower.includes('cloudinary') || lower.includes('invalid cloud_name')) {
    return 'Configuración de almacenamiento incompleta (Cloudinary)';
  }
  if (lower.includes('credentials') || lower.includes('access key')) {
    return 'Configuración de almacenamiento incompleta';
  }
  if (lower.includes('enoent') || lower.includes('eacces') || lower.includes('read-only')) {
    return 'No se pudo guardar el archivo en el servidor';
  }
  if (lower.includes('buffer') || lower.includes('empty')) {
    return 'Archivo recibido sin contenido';
  }

  return message.length > 180 ? `${message.slice(0, 180)}…` : message;
}

function logUploadDebug(
  req: Request,
  auth: AuthPayload,
  documentType: ReturnType<typeof mapDocumentType>,
  file: Express.Multer.File | undefined,
  error?: unknown
) {
  const provider = getCachedStorageProviderMode();
  console.log('[UPLOAD_500_DEBUG]', {
    authUserId: auth.userId,
    hasFile: Boolean(file),
    originalname: file?.originalname ?? null,
    mimetype: file?.mimetype ?? null,
    size: file?.size ?? null,
    bufferLength: file?.buffer?.length ?? null,
    documentTypeField: (req.body as { documentType?: string })?.documentType ?? null,
    resolvedDocumentType: documentType,
    storageProvider: provider,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3).join(' | ') : null,
  });
}

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: Request, @AuthUser() auth: AuthPayload) {
    const file = req.file;
    const body = req.body as { documentType?: string; ownerId?: string };
    const documentType = body.documentType
      ? mapDocumentType(body.documentType)
      : mapDocumentType(file?.fieldname || 'file');

    if (!file) {
      logUploadDebug(req, auth, documentType, file);
      throw new HttpException('Archivo requerido (campo: file)', HttpStatus.BAD_REQUEST);
    }

    if (!file.buffer?.length) {
      logUploadDebug(req, auth, documentType, file);
      throw new HttpException('Archivo recibido sin contenido', HttpStatus.BAD_REQUEST);
    }

    try {
      const storage = await getStorageProvider();
      logUploadDebug(req, auth, documentType, file);

      if (documentType) {
        const stored = await uploadAndStoreDocument(
          file.buffer,
          file.originalname,
          file.mimetype,
          documentType,
          {
            userId: auth.userId,
            ownerId: body.ownerId,
          }
        );
        return normalizeUploadResponse(stored);
      }

      const result = await storage.uploadFile(file.buffer, file.originalname, file.mimetype);
      return normalizeUploadResponse({
        url: result.url,
        storageKey: result.key,
        mimeType: result.mimeType,
        size: result.size,
        provider: result.provider,
        ownerId: auth.userId,
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      logUploadDebug(req, auth, documentType, file, error);
      if (error instanceof HttpException) {
        throw error;
      }

      const message = uploadErrorMessage(error);
      const status =
        message.includes('Configuración de almacenamiento') ||
        message.includes('inicializar el proveedor')
          ? HttpStatus.SERVICE_UNAVAILABLE
          : HttpStatus.INTERNAL_SERVER_ERROR;

      throw new HttpException(message, status);
    }
  }
}
