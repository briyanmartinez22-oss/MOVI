import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import {
  endDriverSession,
  getDriverSessionsList,
  getInvitePreview,
  registerDriverWithInvite,
  startDriverSession,
} from '../services/moviService';

@Controller('drivers')
export class DriversController {
  @Get('invites/:code/preview')
  async invitePreview(@Param('code') code: string) {
    const preview = await getInvitePreview(code);
    if (!preview) {
      throw new HttpException('Código de invitación inválido o ya usado', HttpStatus.NOT_FOUND);
    }
    return preview;
  }

  @Post('register-with-invite')
  async registerWithInvite(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: z.string().min(8),
        dui: z.string().min(5),
        fullName: z.string().min(2),
        code: z.string().min(4),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de registro inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await registerDriverWithInvite(
      parsed.data.phone,
      parsed.data.dui,
      parsed.data.fullName,
      parsed.data.code
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Registro fallido', HttpStatus.BAD_REQUEST);
    }
    return {
      user: result.user,
      driver: result.driver,
      authToken: result.authToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post(':driverId/sessions/start')
  @UseGuards(JwtAuthGuard)
  async startSession(
    @AuthUser() auth: AuthPayload,
    @Param('driverId') driverId: string,
    @Body() body: unknown
  ) {
    const parsed = z
      .object({
        vehicleId: z.string().min(1),
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('vehicleId requerido', HttpStatus.BAD_REQUEST);
    }

    const location =
      parsed.data.latitude != null && parsed.data.longitude != null
        ? { latitude: parsed.data.latitude, longitude: parsed.data.longitude }
        : undefined;

    const result = await startDriverSession(driverId, parsed.data.vehicleId, location);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al iniciar sesión', HttpStatus.BAD_REQUEST);
    }
    void auth;
    return result.session;
  }

  @Post(':driverId/sessions/end')
  @UseGuards(JwtAuthGuard)
  async endSession(@Param('driverId') driverId: string, @Body() body: unknown) {
    const parsed = z
      .object({
        totalTrips: z.number().optional(),
        totalKm: z.number().optional(),
        totalCashCollected: z.number().optional(),
      })
      .safeParse(body ?? {});

    const result = await endDriverSession(
      driverId,
      parsed.success ? parsed.data : undefined
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al finalizar sesión', HttpStatus.BAD_REQUEST);
    }
    return result.session;
  }

  @Get(':driverId/sessions')
  @UseGuards(JwtAuthGuard)
  async listSessions(@Param('driverId') driverId: string) {
    const sessions = await getDriverSessionsList(driverId);
    return sessions;
  }
}
