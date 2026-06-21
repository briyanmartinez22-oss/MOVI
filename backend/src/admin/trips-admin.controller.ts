import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OPS_ROLES } from '../services/admin-staff.service';
import { getAdminTrip360 } from '../services/trip-360.service';

@Controller('admin/trips')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...OPS_ROLES)
export class TripsAdminController {
  @Get(':tripId/360')
  async trip360(@Param('tripId') tripId: string) {
    const data = await getAdminTrip360(tripId);
    if (!data) throw new HttpException('Viaje no encontrado', HttpStatus.NOT_FOUND);
    return data;
  }
}
