import {
  Controller,
  HttpException,
  HttpStatus,
  Logger,
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

@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async upload(@Req() req: Request, @AuthUser() auth: AuthPayload) {
    return this.handleUpload(req, {
      userId: auth.userId,
      route: '/uploads',
    });
  }

  @Post('public')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPublic(@Req() req: Request) {
    return this.handleUpload(req, {
      route: '/uploads/public',
    });
  }

  private async handleUpload(
    req: Request,
    input: {
      route: '/uploads' | '/uploads/public';
      userId?: string;
    }
  ) {
    const file = req.file;
    if (!file) {
      throw new HttpException('Archivo requerido (campo: file)', HttpStatus.BAD_REQUEST);
    }

    const body = req.body as { documentType?: string; ownerId?: string };
    const documentType = body.documentType
      ? mapDocumentType(body.documentType)
      : mapDocumentType(file.fieldname || 'file');
    const logContext = {
      route: input.route,
      documentTypeRaw: body.documentType ?? null,
      mappedDocumentType: documentType,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      hasUser: Boolean(input.userId),
      ownerId: body.ownerId ?? null,
    };

    this.logger.log(`Upload started: ${JSON.stringify(logContext)}`);

    try {
      if (documentType && input.userId) {
        const stored = await uploadAndStoreDocument(
          file.buffer,
          file.originalname,
          file.mimetype,
          documentType,
          {
            userId: input.userId,
            ownerId: body.ownerId,
          }
        );
        this.logger.log(
          `Upload stored document success: ${JSON.stringify({
            route: input.route,
            documentType,
            provider: stored.provider,
            storageKey: stored.storageKey,
          })}`
        );
        return stored;
      }

      if (documentType && !input.userId) {
        this.logger.warn(
          `Upload without auth user, skipping verificationDocument persistence: ${JSON.stringify({
            route: input.route,
            documentType,
          })}`
        );
      }

      const storage = await getStorageProvider();
      const result = await storage.uploadFile(file.buffer, file.originalname, file.mimetype);
      this.logger.log(
        `Upload storage success: ${JSON.stringify({
          route: input.route,
          provider: result.provider,
          storageKey: result.key,
          mimeType: result.mimeType,
          size: result.size,
        })}`
      );
      return {
        url: result.url,
        storageKey: result.key,
        mimeType: result.mimeType,
        size: result.size,
        provider: result.provider,
        ownerId: input.userId ?? null,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Upload failed: ${JSON.stringify({
          route: input.route,
          message,
          documentType,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
        })}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new HttpException(message, HttpStatus.BAD_REQUEST);
    }
  }
}
