import {
  Controller,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { setAdminApproval } from '../services/moviService';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
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
}
