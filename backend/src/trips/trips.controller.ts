import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { prisma } from '../lib/prisma';
import { TripHubService } from '../realtime/trip-hub.service';
import {
  acceptTripOffer,
  advanceTripLifecycle,
  cancelTrip,
  createTripOffer,
  createTripRequest,
  getTripById,
  completeTripRecord,
  getTripHistory,
  getAvailableTripsForDriver,
} from '../services/tripService';

const placeSchema = z.object({
  id: z.string(),
  name: z.string(),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

@Controller('trips')
export class TripsController {
  constructor(private readonly tripHub: TripHubService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async history(@AuthUser() auth: AuthPayload) {
    const trips = await getTripHistory(auth.userId, auth.role);
    return { trips };
  }

  @Post('request')
  @UseGuards(JwtAuthGuard)
  async requestTrip(@AuthUser() auth: AuthPayload, @Body() body: unknown) {
    const parsed = z
      .object({
        origin: placeSchema,
        destination: placeSchema,
        tripType: z.enum(['shared', 'private']),
        kind: z.string().optional(),
        passengerCount: z.number().int().min(1).optional(),
        description: z.string().optional(),
        photoUris: z.array(z.string()).optional(),
        serviceType: z.string().optional(),
        requestType: z.string().optional(),
        deliveryCategory: z.string().optional(),
        businessId: z.string().optional(),
        businessName: z.string().optional(),
        passengerOfferPrice: z.number().optional(),
        passengerName: z.string().optional(),
        cargoDetails: z.record(z.unknown()).optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de viaje inválidos', HttpStatus.BAD_REQUEST);
    }

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }

    const trip = await createTripRequest(
      auth.userId,
      parsed.data.passengerName ?? user.fullName,
      parsed.data
    );
    if (!trip) {
      throw new HttpException('No se pudo crear el viaje', HttpStatus.BAD_REQUEST);
    }

    await this.tripHub.broadcastNewTripRequest(trip.id);
    return trip;
  }

  @Get('available')
  @UseGuards(JwtAuthGuard)
  async available(@AuthUser() auth: AuthPayload) {
    const trips = await getAvailableTripsForDriver(auth.userId);
    return { trips };
  }

  @Get(':tripId')
  @UseGuards(JwtAuthGuard)
  async getTrip(@Param('tripId') tripId: string) {
    const trip = await getTripById(tripId);
    if (!trip) {
      throw new HttpException('Viaje no encontrado', HttpStatus.NOT_FOUND);
    }
    return trip;
  }

  @Post(':tripId/offers')
  @UseGuards(JwtAuthGuard)
  async createOffer(
    @AuthUser() auth: AuthPayload,
    @Param('tripId') tripId: string,
    @Body() body: unknown
  ) {
    const parsed = z
      .object({
        price: z.number().positive(),
        etaMinutes: z.number().int().positive().optional(),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de oferta inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await createTripOffer(tripId, auth.userId, parsed.data);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al crear oferta', HttpStatus.BAD_REQUEST);
    }

    this.tripHub.broadcastToTrip(tripId, 'offer_created', result.trip);
    await this.tripHub.emitTripUpdated(tripId);
    return { offer: result.offer, trip: result.trip };
  }

  @Post(':tripId/offers/:offerId/accept')
  @UseGuards(JwtAuthGuard)
  async acceptOffer(
    @AuthUser() auth: AuthPayload,
    @Param('tripId') tripId: string,
    @Param('offerId') offerId: string
  ) {
    const result = await acceptTripOffer(tripId, offerId, auth.userId);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al aceptar oferta', HttpStatus.BAD_REQUEST);
    }

    this.tripHub.broadcastToTrip(tripId, 'offer_accepted', result.trip);
    await this.tripHub.emitTripUpdated(tripId);
    return result.trip;
  }

  @Patch(':tripId/lifecycle')
  @UseGuards(JwtAuthGuard)
  async lifecycle(
    @AuthUser() auth: AuthPayload,
    @Param('tripId') tripId: string,
    @Body() body: unknown
  ) {
    const parsed = z
      .object({
        lifecycleStatus: z.enum([
          'requested',
          'offered',
          'accepted',
          'driver_arriving',
          'driver_arrived',
          'trip_started',
          'trip_completed',
          'cancelled',
        ]),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Estado inválido', HttpStatus.BAD_REQUEST);
    }

    const result = await advanceTripLifecycle(
      tripId,
      parsed.data.lifecycleStatus,
      auth.userId
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error de lifecycle', HttpStatus.BAD_REQUEST);
    }

    await this.tripHub.emitTripUpdated(tripId);
    return result.trip;
  }

  @Post(':tripId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancel(
    @AuthUser() auth: AuthPayload,
    @Param('tripId') tripId: string,
    @Body() body: unknown
  ) {
    const parsed = z.object({ by: z.enum(['passenger', 'driver']).optional() }).safeParse(body ?? {});
    if (!parsed.success) {
      throw new HttpException('Datos inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await cancelTrip(tripId, auth.userId, parsed.data.by);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al cancelar', HttpStatus.BAD_REQUEST);
    }

    await this.tripHub.emitTripUpdated(tripId);
    return result.trip;
  }

  @Post('complete')
  @UseGuards(JwtAuthGuard)
  async complete(@Body() body: unknown) {
    const parsed = z.object({ tripId: z.string().min(1) }).safeParse(body);
    if (!parsed.success) {
      throw new HttpException('tripId requerido', HttpStatus.BAD_REQUEST);
    }
    const trip = await completeTripRecord(parsed.data.tripId);
    if (!trip) {
      throw new HttpException('Viaje no encontrado', HttpStatus.NOT_FOUND);
    }
    return trip;
  }
}
