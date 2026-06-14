import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { z } from 'zod';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { prisma } from '../lib/prisma';
import {
  registerOwner,
  submitOwnerVerification,
  uploadOwnerDocuments,
} from '../services/moviService';
import { parseMultipartOrJsonDocs } from '../utils/documents';

@Controller('owners')
export class OwnersController {
  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: z.string().min(8),
        fullName: z.string().min(2),
        dui: z.string().min(5),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de registro inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await registerOwner(parsed.data.phone, parsed.data.fullName, parsed.data.dui);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Registro fallido', HttpStatus.BAD_REQUEST);
    }
    return { user: result.user, owner: result.owner, authToken: result.authToken };
  }

  @Post('upload-documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async uploadDocuments(@AuthUser() auth: AuthPayload, @Req() req: Request) {
    const owner = await prisma.owner.findUnique({ where: { userId: auth.userId } });
    if (!owner) {
      throw new HttpException('Dueño no encontrado', HttpStatus.NOT_FOUND);
    }

    const docs = await parseMultipartOrJsonDocs(req);
    const result = await uploadOwnerDocuments(owner.id, docs);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al subir documentos', HttpStatus.BAD_REQUEST);
    }
    return result.owner;
  }

  @Post('submit-verification')
  @UseGuards(JwtAuthGuard)
  async submitVerification(@AuthUser() auth: AuthPayload, @Body() body: unknown) {
    const owner = await prisma.owner.findUnique({ where: { userId: auth.userId } });
    if (!owner) {
      throw new HttpException('Dueño no encontrado', HttpStatus.NOT_FOUND);
    }

    const parsed = z
      .object({
        specialCase: z.string().optional(),
        ownershipProofImage: z.string().optional(),
      })
      .safeParse(body ?? {});
    if (!parsed.success) {
      throw new HttpException('Datos inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await submitOwnerVerification(
      owner.id,
      parsed.data.specialCase,
      parsed.data.ownershipProofImage
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error de verificación', HttpStatus.BAD_REQUEST);
    }
    return result.owner;
  }
}
