import { Controller, Get } from '@nestjs/common';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

@Controller()
export class HealthController {
  @Get('health')
  async health() {
    let database: 'connected' | 'disconnected' = 'disconnected';
    try {
      await prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch {
      database = 'disconnected';
    }

    return {
      status: database === 'connected' ? 'ok' : 'degraded',
      service: 'MOVI backend',
      database,
      environment: env.nodeEnv,
      timestamp: new Date().toISOString(),
    };
  }
}
