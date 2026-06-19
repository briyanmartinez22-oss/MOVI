import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { getTripRatings, submitTripRating } from '../services/rating.service';

@Controller('trips')
@UseGuards(JwtAuthGuard)
export class RatingsController {
  @Post(':tripId/ratings')
  async rate(
    @Param('tripId') tripId: string,
    @Body() body: { stars: number; comment?: string; raterRole: 'passenger' | 'driver' },
    @AuthUser() auth: AuthPayload
  ) {
    const result = await submitTripRating(tripId, auth.userId, body);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error', HttpStatus.BAD_REQUEST);
    }
    return result.rating;
  }

  @Get(':tripId/ratings')
  async list(@Param('tripId') tripId: string) {
    return { ratings: await getTripRatings(tripId) };
  }
}
