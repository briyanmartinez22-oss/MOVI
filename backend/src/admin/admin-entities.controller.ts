import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  approveAdminBusiness,
  approveAdminDriver,
  approveAdminOwner,
  deleteAdminBusiness,
  deleteAdminDriver,
  deleteAdminOwner,
  deleteAdminPassenger,
  getAdminPassengerDetail,
  reactivateAdminBusiness,
  reactivateAdminDriver,
  reactivateAdminOwner,
  reactivateAdminPassenger,
  rejectAdminBusiness,
  rejectAdminDriver,
  rejectAdminOwner,
  suspendAdminBusiness,
  suspendAdminDriver,
  suspendAdminOwner,
  suspendAdminPassenger,
  updateAdminPassenger,
} from '../services/admin-entity-actions.service';
import {
  approveAdminVehicle,
  deleteAdminVehicle,
  getAdminVehicleDetail,
  reactivateAdminVehicle,
  rejectAdminVehicle,
  suspendAdminVehicle,
} from '../services/admin-vehicle-actions.service';
import { triggerOwnerPasswordReset } from '../services/admin-password.service';
import { getAdminStaffRole } from '../services/admin-staff.service';

type AuthRequest = Request & { auth?: AuthPayload };

async function adminCtx(req: AuthRequest) {
  const staffRole = await getAdminStaffRole(req.auth!.userId);
  return { adminUserId: req.auth!.userId, actorRole: staffRole };
}

function throwIfNotOk<T>(result: { ok: boolean; error?: string; data?: T }): T {
  if (!result.ok) {
    throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
  }
  return result.data as T;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
export class AdminEntitiesController {
  @Get('passengers/:id')
  @RequirePermission('passengers.view')
  async passengerDetail(@Param('id') id: string) {
    return throwIfNotOk(await getAdminPassengerDetail(id));
  }

  @Patch('passengers/:id')
  @RequirePermission('passengers.edit')
  async updatePassenger(@Param('id') id: string, @Body() body: unknown, @Req() req: AuthRequest) {
    const parsed = body as { fullName?: string; duiNumber?: string | null; phoneNumber?: string };
    return throwIfNotOk(await updateAdminPassenger(id, parsed, await adminCtx(req)));
  }

  @Post('passengers/:id/suspend')
  @RequirePermission('users.suspend')
  async suspendPassenger(@Param('id') id: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await suspendAdminPassenger(id, await adminCtx(req)));
  }

  @Post('passengers/:id/reactivate')
  @RequirePermission('users.suspend')
  async reactivatePassenger(@Param('id') id: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await reactivateAdminPassenger(id, await adminCtx(req)));
  }

  @Delete('passengers/:id')
  @RequirePermission('passengers.delete')
  async deletePassenger(@Param('id') id: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await deleteAdminPassenger(id, await adminCtx(req)));
  }

  @Post('drivers/:driverId/approve')
  @RequirePermission('drivers.approve')
  async approveDriver(@Param('driverId') driverId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await approveAdminDriver(driverId, await adminCtx(req)));
  }

  @Post('drivers/:driverId/reject')
  @RequirePermission('drivers.approve')
  async rejectDriver(@Param('driverId') driverId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await rejectAdminDriver(driverId, await adminCtx(req)));
  }

  @Post('drivers/:driverId/suspend')
  @RequirePermission('drivers.suspend')
  async suspendDriver(@Param('driverId') driverId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await suspendAdminDriver(driverId, await adminCtx(req)));
  }

  @Post('drivers/:driverId/reactivate')
  @RequirePermission('drivers.suspend')
  async reactivateDriver(@Param('driverId') driverId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await reactivateAdminDriver(driverId, await adminCtx(req)));
  }

  @Delete('drivers/:driverId')
  @RequirePermission('drivers.delete')
  async deleteDriver(@Param('driverId') driverId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await deleteAdminDriver(driverId, await adminCtx(req)));
  }

  @Post('owners/:ownerId/approve')
  @RequirePermission('owners.approve')
  async approveOwner(@Param('ownerId') ownerId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await approveAdminOwner(ownerId, await adminCtx(req)));
  }

  @Post('owners/:ownerId/reject')
  @RequirePermission('owners.approve')
  async rejectOwner(@Param('ownerId') ownerId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await rejectAdminOwner(ownerId, await adminCtx(req)));
  }

  @Post('owners/:ownerId/suspend')
  @RequirePermission('owners.approve')
  async suspendOwner(@Param('ownerId') ownerId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await suspendAdminOwner(ownerId, await adminCtx(req)));
  }

  @Post('owners/:ownerId/reactivate')
  @RequirePermission('owners.approve')
  async reactivateOwner(@Param('ownerId') ownerId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await reactivateAdminOwner(ownerId, await adminCtx(req)));
  }

  @Post('owners/:ownerId/trigger-password-reset')
  @RequirePermission('owners.approve')
  async triggerOwnerPasswordReset(@Param('ownerId') ownerId: string, @Req() req: AuthRequest) {
    const result = await triggerOwnerPasswordReset(ownerId, await adminCtx(req));
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    }
    return result;
  }

  @Delete('owners/:ownerId')
  @RequirePermission('owners.delete')
  async deleteOwner(@Param('ownerId') ownerId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await deleteAdminOwner(ownerId, await adminCtx(req)));
  }

  @Post('businesses/:businessId/approve')
  @RequirePermission('businesses.approve')
  async approveBusiness(@Param('businessId') businessId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await approveAdminBusiness(businessId, await adminCtx(req)));
  }

  @Post('businesses/:businessId/reject')
  @RequirePermission('businesses.approve')
  async rejectBusiness(@Param('businessId') businessId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await rejectAdminBusiness(businessId, await adminCtx(req)));
  }

  @Post('businesses/:businessId/suspend')
  @RequirePermission('businesses.suspend')
  async suspendBusiness(@Param('businessId') businessId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await suspendAdminBusiness(businessId, await adminCtx(req)));
  }

  @Post('businesses/:businessId/reactivate')
  @RequirePermission('businesses.suspend')
  async reactivateBusiness(@Param('businessId') businessId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await reactivateAdminBusiness(businessId, await adminCtx(req)));
  }

  @Delete('businesses/:businessId')
  @RequirePermission('businesses.delete')
  async deleteBusiness(@Param('businessId') businessId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await deleteAdminBusiness(businessId, await adminCtx(req)));
  }

  @Get('vehicles/:vehicleId')
  @RequirePermission('owners.fleet')
  async vehicleDetail(@Param('vehicleId') vehicleId: string) {
    return throwIfNotOk(await getAdminVehicleDetail(vehicleId));
  }

  @Post('vehicles/:vehicleId/approve')
  @RequirePermission('owners.approve')
  async approveVehicle(@Param('vehicleId') vehicleId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await approveAdminVehicle(vehicleId, await adminCtx(req)));
  }

  @Post('vehicles/:vehicleId/reject')
  @RequirePermission('owners.approve')
  async rejectVehicle(
    @Param('vehicleId') vehicleId: string,
    @Body() body: unknown,
    @Req() req: AuthRequest
  ) {
    const reason = (body as { reason?: string })?.reason;
    return throwIfNotOk(await rejectAdminVehicle(vehicleId, reason, await adminCtx(req)));
  }

  @Post('vehicles/:vehicleId/suspend')
  @RequirePermission('owners.approve')
  async suspendVehicle(@Param('vehicleId') vehicleId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await suspendAdminVehicle(vehicleId, await adminCtx(req)));
  }

  @Post('vehicles/:vehicleId/reactivate')
  @RequirePermission('owners.approve')
  async reactivateVehicle(@Param('vehicleId') vehicleId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await reactivateAdminVehicle(vehicleId, await adminCtx(req)));
  }

  @Delete('vehicles/:vehicleId')
  @RequirePermission('owners.delete')
  async deleteVehicle(@Param('vehicleId') vehicleId: string, @Req() req: AuthRequest) {
    return throwIfNotOk(await deleteAdminVehicle(vehicleId, await adminCtx(req)));
  }
}
