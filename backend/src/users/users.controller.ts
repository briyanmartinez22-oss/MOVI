import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { getUserProfiles, getUserRoles, listOwnerVehicles } from '../services/users.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  @Get('me/profiles')
  async profiles(@AuthUser() auth: AuthPayload) {
    const profiles = await getUserProfiles(auth.userId);
    if (!profiles) {
      return null;
    }
    return profiles;
  }

  @Get('me/roles')
  async roles(@AuthUser() auth: AuthPayload) {
    return { roles: await getUserRoles(auth.userId) };
  }

  @Get('me/vehicles')
  async myVehicles(@AuthUser() auth: AuthPayload) {
    return { vehicles: await listOwnerVehicles(auth.userId) };
  }
}
