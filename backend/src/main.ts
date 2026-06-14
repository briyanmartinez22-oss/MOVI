import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import express from 'express';
import path from 'node:path';
import { AppModule } from './app.module';
import { assertEnv, env } from './config/env';
import { TripHubService } from './realtime/trip-hub.service';

async function bootstrap() {
  assertEnv();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
  });

  app.enableCors({
    origin: env.corsOrigin === '*' ? true : env.corsOrigin,
  });
  app.use(express.json({ limit: '10mb' }));

  if (env.storageMode !== 's3') {
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    app.use('/uploads', express.static(uploadsDir));
  }

  const tripHub = app.get(TripHubService);
  tripHub.attach(app.getHttpServer());

  await app.listen(env.port, '0.0.0.0');

  const publicBase = env.publicUrl ?? `http://0.0.0.0:${env.port}`;
  const wsBase = publicBase.startsWith('https://')
    ? publicBase.replace(/^https/, 'wss')
    : publicBase.replace(/^http/, 'ws');

  console.log(`MOVI backend listening on port ${env.port}`);
  console.log(`Health: ${publicBase}/health`);
  console.log(`WebSocket: ${wsBase}/ws`);
  console.log(`Database: ${env.databaseProvider}`);
  console.log(`SMS provider: ${env.twilioAccountSid ? 'twilio' : 'demo (console log)'}`);
}

bootstrap();
