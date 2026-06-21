import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminStaffRoles } from '../common/decorators/admin-staff.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminStaffGuard } from '../common/guards/admin-staff.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { OPS_ROLES } from '../services/admin-staff.service';
import { listAdminRequests, listAdminTrips, listProviders } from '../services/admin.service';
import { setAdminApproval, setAdminSuspension } from '../services/moviService';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard, AdminStaffGuard)
@Roles('admin')
@AdminStaffRoles(...OPS_ROLES)
export class AdminController {
  @Get('providers')
  async providers() {
    return { providers: await listProviders() };
  }

  @Get('trips')
  async trips(@Query('status') status?: string) {
    return { trips: await listAdminTrips(status) };
  }

  @Get('requests')
  async requests() {
    return { requests: await listAdminRequests() };
  }

  @Post('vehicles/:vehicleId/approve')
  async approveVehicle(@Param('vehicleId') vehicleId: string) {
    const result = await setAdminApproval('vehicle', vehicleId, 'approve');
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }

  @Post('vehicles/:vehicleId/reject')
  async rejectVehicle(@Param('vehicleId') vehicleId: string) {
    const result = await setAdminApproval('vehicle', vehicleId, 'reject');
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }

  @Post('vehicles/:vehicleId/suspend')
  async suspendVehicle(@Param('vehicleId') vehicleId: string) {
    const result = await setAdminSuspension('vehicle', vehicleId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }
}
