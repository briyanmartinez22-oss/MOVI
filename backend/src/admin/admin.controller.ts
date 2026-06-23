import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OPS_ROLES, getAdminStaffRole } from '../services/admin-staff.service';
import { listAdminRequests, listAdminTrips, listProviders } from '../services/admin.service';
import {
  approveAdminVehicle,
  rejectAdminVehicle,
  suspendAdminVehicle,
} from '../services/admin-vehicle-actions.service';

type AuthRequest = Request & { auth?: AuthPayload };

async function adminCtx(req: AuthRequest) {
  const staffRole = await getAdminStaffRole(req.auth!.userId);
  return { adminUserId: req.auth!.userId, actorRole: staffRole };
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...OPS_ROLES)
export class AdminController {
  @Get('providers')
  async providers() {
    return { providers: await listProviders() };
  }

  @Get('trips')
  async trips(@Query('status') status?: string) {
    return { trips: await listAdminTrips(status) };
  }

  @Get('requests')
  async requests() {
    return { requests: await listAdminRequests() };
  }

  @Post('vehicles/:vehicleId/approve')
  async approveVehicle(@Param('vehicleId') vehicleId: string, @Req() req: AuthRequest) {
    const result = await approveAdminVehicle(vehicleId, await adminCtx(req));
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.BAD_REQUEST);
    }
    return result.data;
  }

  @Post('vehicles/:vehicleId/reject')
  async rejectVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body() body: unknown,
    @Req() req: AuthRequest
  ) {
    const reason = (body as { reason?: string })?.reason;
    const result = await rejectAdminVehicle(vehicleId, reason, await adminCtx(req));
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.BAD_REQUEST);
    }
    return result.data;
  }

  @Post('vehicles/:vehicleId/suspend')
  async suspendVehicle(@Param('vehicleId') vehicleId: string, @Req() req: AuthRequest) {
    const result = await suspendAdminVehicle(vehicleId, await adminCtx(req));
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.BAD_REQUEST);
    }
    return result.data;
  }
}
