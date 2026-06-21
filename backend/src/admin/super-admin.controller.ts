import { Controller, Get, HttpException, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdminStaffRoles, RequirePermission } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  env,
  getResolvedMapsMode,
  getResolvedOtpMode,
  getResolvedPushMode,
  getResolvedStorageMode,
} from '../config/env';
import { issueRefreshToken } from '../lib/refreshToken';
import { signAuthToken } from '../lib/jwt';
import { prisma } from '../lib/prisma';
import {
  listAdminBusinesses,
  listAdminDeliveries,
  listAdminOwners,
  listAdminStaff,
  listAdminSubscriptions,
} from '../services/admin.service';
import { writeAdminAudit } from '../services/audit.service';
import { getAdminStaffRole } from '../services/admin-staff.service';
import { getMe } from '../services/moviService';

type AuthRequest = Request & { auth?: AuthPayload };

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
export class SuperAdminController {
  @Get('owners')
  @AdminStaffRoles('SUPER_ADMIN', 'OPS_ADMIN', 'COMPLIANCE_ADMIN')
  async owners() {
    return { owners: await listAdminOwners() };
  }

  @Get('businesses')
  @AdminStaffRoles('SUPER_ADMIN', 'OPS_ADMIN', 'COMPLIANCE_ADMIN')
  async businesses() {
    return { businesses: await listAdminBusinesses() };
  }

  @Get('deliveries')
  @AdminStaffRoles('SUPER_ADMIN', 'OPS_ADMIN')
  async deliveries() {
    return { deliveries: await listAdminDeliveries() };
  }

  @Get('subscriptions')
  @AdminStaffRoles('SUPER_ADMIN', 'FINANCE_ADMIN')
  async subscriptions() {
    return { subscriptions: await listAdminSubscriptions() };
  }

  @Get('admins')
  @RequirePermission('admin.create')
  async admins() {
    return { admins: await listAdminStaff() };
  }

  @Get('system/status')
  @RequirePermission('system.integrations')
  async systemStatus() {
    let database: 'connected' | 'error' = 'error';
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'error';
    }

    return {
      environment: env.nodeEnv,
      publicUrl: env.publicUrl ?? null,
      railway: {
        detected: Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID),
        environment: process.env.RAILWAY_ENVIRONMENT ?? null,
        service: process.env.RAILWAY_SERVICE_NAME ?? null,
      },
      database: {
        provider: env.databaseProvider,
        status: database,
      },
      websocket: {
        path: '/ws',
        active: true,
      },
      integrations: {
        storage: getResolvedStorageMode(),
        maps: getResolvedMapsMode(),
        otp: getResolvedOtpMode(),
        push: getResolvedPushMode(),
      },
    };
  }

  @Post('users/:userId/impersonate')
  @RequirePermission('users.impersonate')
  async impersonate(@Param('userId') userId: string, @Req() req: AuthRequest) {
    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    const actorRole = await getAdminStaffRole(req.auth!.userId);
    await writeAdminAudit({
      userId: req.auth!.userId,
      actorRole: actorRole ?? undefined,
      action: 'login',
      entityType: 'user',
      entityId: userId,
      before: { impersonatedBy: req.auth!.userId },
      after: { impersonatedAs: target.id, role: target.role },
    });

    const user = await getMe(target.id);
    const authToken = signAuthToken({ userId: target.id, role: target.role });
    const refresh = await issueRefreshToken(target.id);
    return {
      user,
      authToken,
      refreshToken: refresh.refreshToken,
      impersonated: true,
      impersonatedBy: req.auth!.userId,
    };
  }
}
