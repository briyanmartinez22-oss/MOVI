import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { COMPLIANCE_ROLES } from '../services/admin-staff.service';
import { searchAuditLogs } from '../services/audit-admin.service';

@Controller('admin/audit')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...COMPLIANCE_ROLES)
export class AuditController {
  @Get()
  async search(
    @Query('userId') userId?: string,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string
  ) {
    return {
      logs: await searchAuditLogs({
        userId,
        action,
        entityType,
        entityId,
        from,
        to,
        limit: Number(limit) || 100,
      }),
    };
  }
}
