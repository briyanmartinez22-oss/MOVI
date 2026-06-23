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
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import {
  cancelVehicleInvite,
  extendVehicleInvite,
  listAllVehicleInvitesAdmin,
  regenerateVehicleInvite,
  revokeVehicleInvite,
} from '../services/vehicle-invite.service';
import {
  getInvitePreview,
  validateDriverInviteCode,
  registerDriverWithInvite,
  endDriverSession,
  getDriverSessionsList,
  startDriverSession,
} from '../services/moviService';

@Controller('drivers')
export class DriversController {
  @Post('invites/validate')
  async validateInvite(@Body() body: unknown) {
    const parsed = z.object({ code: z.string().min(4) }).safeParse(body ?? {});
    if (!parsed.success) {
      throw new HttpException('Código requerido', HttpStatus.BAD_REQUEST);
    }
    const result = await validateDriverInviteCode(parsed.data.code);
    if (!result.ok) {
      throw new HttpException(
        { message: result.error ?? 'Código inválido', code: result.code },
        HttpStatus.BAD_REQUEST
      );
    }
    return result.preview;
  }

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
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional().or(z.literal('')),
        birthDate: z.string().optional(),
        code: z.string().min(4),
        licenseFront: z.string().min(1),
        licenseBack: z.string().min(1),
        password: z.string().min(8),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de registro inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await registerDriverWithInvite({
      phone: parsed.data.phone,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      email: parsed.data.email || undefined,
      birthDate: parsed.data.birthDate,
      code: parsed.data.code,
      licenseFront: parsed.data.licenseFront,
      licenseBack: parsed.data.licenseBack,
      password: parsed.data.password,
    });
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

@Controller('admin/vehicle-invites')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles('SUPER_ADMIN', 'OPS_ADMIN', 'COMPLIANCE_ADMIN')
export class AdminVehicleInvitesController {
  @Get()
  async list() {
    return { invites: await listAllVehicleInvitesAdmin() };
  }

  @Post(':inviteId/revoke')
  async revoke(@AuthUser() auth: AuthPayload, @Param('inviteId') inviteId: string) {
    const result = await revokeVehicleInvite(inviteId, auth.userId);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return result.invite;
  }

  @Post(':inviteId/cancel')
  async cancel(@AuthUser() auth: AuthPayload, @Param('inviteId') inviteId: string) {
    const result = await cancelVehicleInvite(inviteId, auth.userId);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return result.invite;
  }

  @Post(':inviteId/extend')
  async extend(@AuthUser() auth: AuthPayload, @Param('inviteId') inviteId: string) {
    const result = await extendVehicleInvite(inviteId, auth.userId);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return result.invite;
  }

  @Post(':inviteId/regenerate')
  async regenerate(@AuthUser() auth: AuthPayload, @Param('inviteId') inviteId: string) {
    const result = await regenerateVehicleInvite(inviteId, auth.userId);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return result.invite;
  }
}
