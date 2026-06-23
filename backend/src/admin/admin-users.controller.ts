import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminStaffRoles, RequirePermission } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { listAdminDrivers, listAdminPassengers } from '../services/admin.service';
import { listAdminVehicles } from '../services/admin-vehicle-actions.service';
import { COMPLIANCE_ROLES, OPS_ROLES } from '../services/admin-staff.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
export class AdminUsersController {
  @Get('drivers')
  @AdminStaffRoles(...OPS_ROLES)
  async drivers() {
    return { drivers: await listAdminDrivers() };
  }

  @Get('passengers')
  @AdminStaffRoles(...OPS_ROLES)
  async passengers() {
    return { passengers: await listAdminPassengers() };
  }

  @Get('vehicles')
  @RequirePermission('owners.fleet')
  @AdminStaffRoles(...COMPLIANCE_ROLES, ...OPS_ROLES)
  async vehicles() {
    return { vehicles: await listAdminVehicles() };
  }
}
