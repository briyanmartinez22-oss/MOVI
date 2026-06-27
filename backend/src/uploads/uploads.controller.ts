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
import { getStorageProvider } from '../services/storageProvider';

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

@Controller('uploads')
export class UploadsController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: Request, @AuthUser() auth: AuthPayload) {
    const file = req.file;
    if (!file) {
      throw new HttpException('Archivo requerido (campo: file)', HttpStatus.BAD_REQUEST);
    }

    const body = req.body as { documentType?: string; ownerId?: string };
    const documentType = body.documentType
      ? mapDocumentType(body.documentType)
      : mapDocumentType(file.fieldname || 'file');

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

    const storage = await getStorageProvider();
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
  }
}
