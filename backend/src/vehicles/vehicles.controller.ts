import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
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
  checkPlate,
  inviteDriver,
  registerVehicle,
  submitVehicleVerification,
  uploadVehicleDocuments,
} from '../services/moviService';
import { parseMultipartOrJsonDocs } from '../utils/documents';

@Controller('vehicles')
export class VehiclesController {
  @Get('check-plate/:plate')
  async checkPlate(@Param('plate') plate: string) {
    const result = await checkPlate(plate);
    if (!result.ok) {
      throw new HttpException('Error al verificar placa', HttpStatus.BAD_REQUEST);
    }
    return result.data;
  }

  @Post('register')
  @UseGuards(JwtAuthGuard)
  async register(@AuthUser() auth: AuthPayload, @Body() body: unknown) {
    const owner = await prisma.owner.findUnique({ where: { userId: auth.userId } });
    if (!owner) {
      throw new HttpException('Dueño no encontrado', HttpStatus.NOT_FOUND);
    }

    const parsed = z
      .object({
        unitNumber: z.string().min(1),
        plateNumber: z.string().min(3),
        associationName: z.string().min(1),
        vehicleType: z.string().optional(),
        registrationName: z.string().optional(),
        maxLoadKg: z.number().optional(),
        bedLengthM: z.number().optional(),
        hasCargoCover: z.boolean().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de vehículo inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await registerVehicle(owner.id, parsed.data);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Registro fallido', HttpStatus.BAD_REQUEST);
    }
    return result.vehicle;
  }

  @Post(':vehicleId/upload-documents')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(AnyFilesInterceptor())
  async uploadDocuments(@Param('vehicleId') vehicleId: string, @Req() req: Request) {
    const docs = await parseMultipartOrJsonDocs(req);
    const result = await uploadVehicleDocuments(vehicleId, docs);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al subir documentos', HttpStatus.BAD_REQUEST);
    }
    return result.vehicle;
  }

  @Post(':vehicleId/submit-verification')
  @UseGuards(JwtAuthGuard)
  async submitVerification(@Param('vehicleId') vehicleId: string) {
    const result = await submitVehicleVerification(vehicleId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error de verificación', HttpStatus.BAD_REQUEST);
    }
    return result.vehicle;
  }

  @Post(':vehicleId/invite-driver')
  @UseGuards(JwtAuthGuard)
  async inviteDriver(@Param('vehicleId') vehicleId: string) {
    const result = await inviteDriver(vehicleId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al invitar conductor', HttpStatus.BAD_REQUEST);
    }
    return result.invite;
  }
}
