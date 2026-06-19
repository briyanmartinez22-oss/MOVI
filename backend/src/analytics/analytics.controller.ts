import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
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
