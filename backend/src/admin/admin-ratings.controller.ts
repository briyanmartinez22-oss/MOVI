import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OPS_ROLES, FINANCE_ROLES } from '../services/admin-staff.service';
import { listAdminRatings } from '../services/rating.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
export class AdminRatingsController {
  @Get('ratings')
  @AdminStaffRoles(...OPS_ROLES, ...FINANCE_ROLES)
  async ratings(@Query('limit') limit?: string) {
    return await listAdminRatings(Number(limit) || 50);
  }
}
