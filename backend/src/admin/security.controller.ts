import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
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
  COMPLIANCE_ROLES,
  getAdminStaffRole,
} from '../services/admin-staff.service';
import {
  getSecuritySummary,
  listSecurityEvents,
  suspendUser,
  unsuspendUser,
} from '../services/security-admin.service';

type AuthRequest = Request & { auth?: AuthPayload };

@Controller('admin/security')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...COMPLIANCE_ROLES)
export class SecurityController {
  @Get('summary')
  async summary() {
    return getSecuritySummary();
  }

  @Get('events')
  async events(@Query('limit') limit?: string) {
    return await listSecurityEvents(Number(limit) || 50);
  }

  @Post('users/:id/suspend')
  async suspend(@Param('id') id: string, @Req() req: AuthRequest) {
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await suspendUser(id, req.auth!.userId, actorRole);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return { ok: true };
  }

  @Post('users/:id/unsuspend')
  async unsuspend(@Param('id') id: string, @Req() req: AuthRequest) {
    const actorRole = await getAdminStaffRole(req.auth!.userId);
    const result = await unsuspendUser(id, req.auth!.userId, actorRole);
    if (!result.ok) throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    return { ok: true };
  }
}
