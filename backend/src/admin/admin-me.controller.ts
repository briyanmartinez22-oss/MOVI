import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAdminStaffRole } from '../services/admin-staff.service';
import { getMe } from '../services/moviService';

type AuthRequest = Request & { auth?: AuthPayload };

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminMeController {
  @Get('me')
  async me(@Req() req: AuthRequest) {
    const userId = req.auth!.userId;
    const user = await getMe(userId);
    const staffRole = await getAdminStaffRole(userId);
    return { user, staffRole };
  }
}
