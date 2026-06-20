import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import {
  env,
  getResolvedMapsMode,
  getResolvedOtpMode,
  getResolvedPushMode,
  getResolvedStorageMode,
  isCloudinaryConfigured,
  isFirebasePushConfigured,
  isGoogleMapsConfigured,
  isMapboxConfigured,
  isS3Configured,
  isTwilioConfigured,
  isTwilioVerifyConfigured,
} from '../config/env';
import { getMapsProvider } from '../services/mapsProvider';
import { verifyCloudinaryConnection } from '../services/cloudinary.service';
import { verifyMapsConnection } from '../services/maps.service';
import { getDemandZonesSeed } from '../services/moviService';

@Controller()
export class LocationsController {
  @Get('demand-zones')
  demandZones() {
    return getDemandZonesSeed();
  }

  @Get('locations/geocode')
  async geocode(@Query('q') q?: string) {
    const query = q?.trim() ?? '';
    if (!query) return { results: [] };
    const maps = await getMapsProvider();
    const results = await maps.geocode(query);
    return { results, provider: maps.mode };
  }

  @Get('locations/reverse')
  async reverseGeocode(@Query('lat') lat?: string, @Query('lng') lng?: string) {
    const parsed = z
      .object({
        lat: z.coerce.number(),
        lng: z.coerce.number(),
      })
      .safeParse({ lat, lng });
    if (!parsed.success) {
      return { name: null, error: 'Coordenadas inválidas' };
    }
    const maps = await getMapsProvider();
    const name = await maps.reverseGeocode({
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
    });
    return { name, provider: maps.mode };
  }

  @Post('locations/distance')
  async distance(@Body() body: unknown) {
    const parsed = z
      .object({
        origin: z.object({ latitude: z.number(), longitude: z.number() }),
        destination: z.object({ latitude: z.number(), longitude: z.number() }),
      })
      .safeParse(body);
    if (!parsed.success) return { error: 'Datos inválidos' };

    const maps = await getMapsProvider();
    const route = await maps.getRoute(parsed.data.origin, parsed.data.destination);
    return {
      distanceKm: route.distanceKm,
      etaMinutes: route.durationMinutes,
      provider: maps.mode,
      polyline: route.polyline,
      path: route.path,
    };
  }

  @Post('locations/route')
  async route(@Body() body: unknown) {
    const parsed = z
      .object({
        origin: z.object({ latitude: z.number(), longitude: z.number() }),
        destination: z.object({ latitude: z.number(), longitude: z.number() }),
      })
      .safeParse(body);
    if (!parsed.success) return { error: 'Datos inválidos' };

    const maps = await getMapsProvider();
    const route = await maps.getRoute(parsed.data.origin, parsed.data.destination);
    return route;
  }

  @Get('integrations/status')
  integrationsStatus() {
    const storageMode = getResolvedStorageMode();
    const mapsMode = getResolvedMapsMode();
    const otpMode = getResolvedOtpMode();
    const pushMode = getResolvedPushMode();

    return {
      environment: env.nodeEnv,
      storage: {
        requested: env.storageProvider,
        active: storageMode,
        configured: {
          cloudinary: isCloudinaryConfigured(),
          s3: isS3Configured(),
          local: true,
        },
        cloudinary: {
          active: storageMode === 'cloudinary',
          configured: isCloudinaryConfigured(),
          cloudName: isCloudinaryConfigured() ? env.cloudinaryCloudName ?? null : null,
          folder: isCloudinaryConfigured() ? env.cloudinaryFolder : null,
        },
      },
      maps: {
        requested: env.mapsProvider,
        active: mapsMode,
        configured: {
          google: isGoogleMapsConfigured(),
          mapbox: isMapboxConfigured(),
          fallback: true,
        },
        google: {
          active: mapsMode === 'google',
          configured: isGoogleMapsConfigured(),
        },
      },
      otp: {
        requested: env.otpProvider,
        active: otpMode,
        demoAllowed: env.nodeEnv !== 'production',
        configured: {
          twilio: isTwilioConfigured(),
          twilioVerify: isTwilioVerifyConfigured(),
          demo: env.nodeEnv !== 'production',
        },
      },
      push: {
        requested: env.pushProvider,
        active: pushMode,
        configured: {
          expo: env.pushProvider === 'expo',
          firebase: isFirebasePushConfigured(),
          none: true,
        },
      },
    };
  }

  @Get('integrations/cloudinary/test')
  async cloudinaryTest() {
    return verifyCloudinaryConnection();
  }

  @Get('integrations/maps/test')
  async mapsTest() {
    return verifyMapsConnection();
  }
}
