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
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TripHubService } from '../realtime/trip-hub.service';
import { getAdminStaffRole, OPS_ROLES } from '../services/admin-staff.service';
import { writeAdminAudit } from '../services/audit.service';
import { adminDispatchTrip, getDispatchCandidates } from '../services/dispatch.service';
import {
  adminCancelTrip,
  adminReassignDriver,
  getAdminTripDetail,
  getAvailableDriversForReassign,
  getLiveDrivers,
  getLiveTrips,
  getOperationsAlerts,
  getOperationsLiveSnapshot,
} from '../services/operations-live.service';

type AuthRequest = Request & { auth?: AuthPayload };

@Controller('admin/operations-live')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...OPS_ROLES)
export class OperationsLiveController {
  constructor(private readonly tripHub: TripHubService) {}

  @Get('snapshot')
  async snapshot() {
    return getOperationsLiveSnapshot();
  }

  @Get('drivers')
  async drivers() {
    return { drivers: await getLiveDrivers() };
  }

  @Get('trips')
  async trips() {
    return { trips: await getLiveTrips() };
  }

  @Get('alerts')
  async alerts() {
    return { alerts: await getOperationsAlerts() };
  }

  @Get('trips/:tripId')
  async tripDetail(@Param('tripId') tripId: string) {
    const trip = await getAdminTripDetail(tripId);
    if (!trip) {
      throw new HttpException('Viaje no encontrado', HttpStatus.NOT_FOUND);
    }
    return { trip };
  }

  @Get('trips/:tripId/available-drivers')
  async availableDrivers(@Param('tripId') tripId: string) {
    return { drivers: await getAvailableDriversForReassign(tripId) };
  }

  @Post('trips/:tripId/cancel')
  async cancelTrip(@Param('tripId') tripId: string, @Req() req: AuthRequest) {
    const result = await adminCancelTrip(tripId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    }
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    void writeAdminAudit({
      userId: req.auth!.userId,
      actorRole,
      action: 'cancel',
      entityType: 'trip',
      entityId: tripId,
      after: { lifecycleStatus: 'cancelled' },
    });
    await this.tripHub.emitTripUpdated(tripId);
    await this.tripHub.broadcastAdminOpsRefresh();
    return { trip: result.trip };
  }

  @Post('trips/:tripId/reassign')
  async reassignTrip(
    @Param('tripId') tripId: string,
    @Body() body: { driverId?: string },
    @Req() req: AuthRequest
  ) {
    const driverId = body?.driverId?.trim();
    if (!driverId) {
      throw new HttpException('driverId requerido', HttpStatus.BAD_REQUEST);
    }

    const result = await adminReassignDriver(tripId, driverId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    }
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    void writeAdminAudit({
      userId: req.auth!.userId,
      actorRole,
      action: 'reassign',
      entityType: 'trip',
      entityId: tripId,
      changes: { driverId },
    });
    await this.tripHub.emitTripUpdated(tripId);
    await this.tripHub.broadcastAdminOpsRefresh();
    return { trip: result.trip };
  }

  @Get('trips/:tripId/dispatch-candidates')
  async dispatchCandidates(@Param('tripId') tripId: string) {
    return { candidates: await getDispatchCandidates(tripId) };
  }

  @Post('trips/:tripId/dispatch')
  async dispatchTrip(
    @Param('tripId') tripId: string,
    @Body() body: { driverId?: string },
    @Req() req: AuthRequest
  ) {
    const driverId = body?.driverId?.trim();
    if (!driverId) {
      throw new HttpException('driverId requerido', HttpStatus.BAD_REQUEST);
    }
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await adminDispatchTrip(tripId, driverId, req.auth!.userId, actorRole);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    }
    await this.tripHub.emitTripUpdated(tripId);
    await this.tripHub.broadcastAdminOpsRefresh();
    return { trip: result.trip };
  }
}
