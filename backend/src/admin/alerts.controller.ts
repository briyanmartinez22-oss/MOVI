import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
import {
  acknowledgeAlert,
  listOperationalAlerts,
  resolveAlert,
} from '../services/alerts-center.service';
import { getAdminStaffRole, OPS_ROLES } from '../services/admin-staff.service';

type AuthRequest = Request & { auth?: AuthPayload };

@Controller('admin/alerts')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...OPS_ROLES)
export class AlertsController {
  @Get()
  async list(@Query('status') status?: string) {
    return { alerts: await listOperationalAlerts(status) };
  }

  @Post(':id/ack')
  async ack(@Param('id') id: string, @Req() req: AuthRequest) {
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await acknowledgeAlert(id, req.auth!.userId, actorRole);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return { alert: result.alert };
  }

  @Post(':id/resolve')
  async resolve(@Param('id') id: string, @Req() req: AuthRequest) {
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await resolveAlert(id, req.auth!.userId, actorRole);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return { alert: result.alert };
  }
}
