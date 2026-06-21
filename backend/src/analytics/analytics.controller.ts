import { Controller, Get, UseGuards } from '@nestjs/common';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OPS_ROLES } from '../services/admin-staff.service';
import {
  getMetricsProviders,
  getMetricsRatings,
  getMetricsRecentActivity,
  getMetricsSubscriptions,
  getMetricsSummary,
  getMetricsTrips,
} from '../services/admin-metrics.service';
import { getAdminKpis, listPendingVerifications } from '../services/analytics.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...OPS_ROLES)
export class AnalyticsController {
  @Get('kpis')
  async kpis() {
    return getAdminKpis();
  }

  @Get('verifications/pending')
  async pendingVerifications() {
    return listPendingVerifications();
  }

  @Get('metrics/summary')
  async metricsSummary() {
    return getMetricsSummary();
  }

  @Get('metrics/providers')
  async metricsProviders() {
    return getMetricsProviders();
  }

  @Get('metrics/trips')
  async metricsTrips() {
    return getMetricsTrips();
  }

  @Get('metrics/ratings')
  async metricsRatings() {
    return getMetricsRatings();
  }

  @Get('metrics/subscriptions')
  async metricsSubscriptions() {
    return getMetricsSubscriptions();
  }

  @Get('metrics/recent-activity')
  async metricsRecentActivity() {
    return getMetricsRecentActivity();
  }
}
