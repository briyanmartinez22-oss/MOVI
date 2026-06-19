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
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { listAdminRequests, listAdminTrips, listProviders } from '../services/admin.service';
import { setAdminApproval, setAdminSuspension } from '../services/moviService';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
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

  @Post('owners/:ownerId/approve')
  async approveOwner(@Param('ownerId') ownerId: string) {
    const result = await setAdminApproval('owner', ownerId, 'approve');
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }

  @Post('owners/:ownerId/reject')
  async rejectOwner(@Param('ownerId') ownerId: string) {
    const result = await setAdminApproval('owner', ownerId, 'reject');
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }

  @Post('owners/:ownerId/suspend')
  async suspendOwner(@Param('ownerId') ownerId: string) {
    const result = await setAdminSuspension('owner', ownerId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
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

  @Post('drivers/:driverId/approve')
  async approveDriver(@Param('driverId') driverId: string) {
    const result = await setAdminApproval('driver', driverId, 'approve');
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }

  @Post('drivers/:driverId/reject')
  async rejectDriver(@Param('driverId') driverId: string) {
    const result = await setAdminApproval('driver', driverId, 'reject');
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }

  @Post('drivers/:driverId/suspend')
  async suspendDriver(@Param('driverId') driverId: string) {
    const result = await setAdminSuspension('driver', driverId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'No encontrado', HttpStatus.NOT_FOUND);
    }
    return result.data;
  }
}
