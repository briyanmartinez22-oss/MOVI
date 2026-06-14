import { Controller, Get } from '@nestjs/common';
import { getDemandZonesSeed } from '../services/moviService';

@Controller()
export class LocationsController {
  @Get('demand-zones')
  demandZones() {
    return getDemandZonesSeed();
  }
}
