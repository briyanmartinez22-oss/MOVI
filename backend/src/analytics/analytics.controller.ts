import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { getAdminKpis, listPendingVerifications } from '../services/analytics.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AnalyticsController {
  @Get('kpis')
  async kpis() {
    return getAdminKpis();
  }

  @Get('verifications/pending')
  async pendingVerifications() {
    return listPendingVerifications();
  }
}
