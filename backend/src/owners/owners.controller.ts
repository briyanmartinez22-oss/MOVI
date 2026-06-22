import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
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
  selfAssignOwnerAsDriver,
  submitOwnerVerification,
  uploadOwnerDocuments,
} from '../services/moviService';
import {
  cancelVehicleInvite,
  listVehicleInvitesForOwner,
  regenerateVehicleInvite,
} from '../services/vehicle-invite.service';
import { parseMultipartOrJsonDocs } from '../utils/documents';

@Controller('owners')
export class OwnersController {
  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        fullName: z.string().min(2).optional(),
        dui: z.string().min(5),
        email: z.string().email().optional().or(z.literal('')),
        documentType: z.enum(['DUI', 'LICENSE']).optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de registro inválidos', HttpStatus.BAD_REQUEST);
    }

    const firstName = parsed.data.firstName ?? parsed.data.fullName?.split(' ')[0] ?? '';
    const lastName =
      parsed.data.lastName ?? parsed.data.fullName?.split(' ').slice(1).join(' ') ?? '';

    const result = await registerOwner(
      parsed.data.phone,
      firstName,
      lastName,
      parsed.data.dui,
      parsed.data.email || undefined,
      parsed.data.documentType
    );
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

  @Post('me/self-assign-driver')
  @UseGuards(JwtAuthGuard)
  async selfAssignDriver(@AuthUser() auth: AuthPayload, @Body() body: unknown) {
    const owner = await prisma.owner.findUnique({ where: { userId: auth.userId } });
    if (!owner) {
      throw new HttpException('Dueño no encontrado', HttpStatus.NOT_FOUND);
    }

    const parsed = z
      .object({
        vehicleId: z.string().min(1),
        licenseFront: z.string().min(1),
        licenseBack: z.string().min(1),
      })
      .safeParse(body ?? {});
    if (!parsed.success) {
      throw new HttpException('vehicleId y licencia requeridos', HttpStatus.BAD_REQUEST);
    }

    const result = await selfAssignOwnerAsDriver(auth.userId, parsed.data.vehicleId, {
      licenseFront: parsed.data.licenseFront,
      licenseBack: parsed.data.licenseBack,
    });
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No se pudo asignar', HttpStatus.BAD_REQUEST);
    }
    return { driver: result.driver };
  }

  @Get('me/vehicle-invites')
  @UseGuards(JwtAuthGuard)
  async listVehicleInvites(
    @AuthUser() auth: AuthPayload,
    @Query('vehicleId') vehicleId?: string
  ) {
    const owner = await prisma.owner.findUnique({ where: { userId: auth.userId } });
    if (!owner) {
      throw new HttpException('Dueño no encontrado', HttpStatus.NOT_FOUND);
    }
    return { invites: await listVehicleInvitesForOwner(owner.id, vehicleId) };
  }

  @Post('me/vehicle-invites/:inviteId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelVehicleInvite(
    @AuthUser() auth: AuthPayload,
    @Param('inviteId') inviteId: string
  ) {
    const owner = await prisma.owner.findUnique({ where: { userId: auth.userId } });
    if (!owner) {
      throw new HttpException('Dueño no encontrado', HttpStatus.NOT_FOUND);
    }
    const invite = await prisma.vehicleInvite.findFirst({
      where: { id: inviteId, ownerId: owner.id },
    });
    if (!invite) {
      throw new HttpException('Invitación no encontrada', HttpStatus.NOT_FOUND);
    }
    const result = await cancelVehicleInvite(inviteId, auth.userId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    }
    return result.invite;
  }

  @Post('me/vehicle-invites/:inviteId/regenerate')
  @UseGuards(JwtAuthGuard)
  async regenerateVehicleInvite(
    @AuthUser() auth: AuthPayload,
    @Param('inviteId') inviteId: string
  ) {
    const owner = await prisma.owner.findUnique({ where: { userId: auth.userId } });
    if (!owner) {
      throw new HttpException('Dueño no encontrado', HttpStatus.NOT_FOUND);
    }
    const invite = await prisma.vehicleInvite.findFirst({
      where: { id: inviteId, ownerId: owner.id },
    });
    if (!invite) {
      throw new HttpException('Invitación no encontrada', HttpStatus.NOT_FOUND);
    }
    const result = await regenerateVehicleInvite(inviteId, auth.userId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    }
    return result.invite;
  }
}
