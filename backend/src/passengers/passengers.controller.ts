import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { z } from 'zod';
import { registerPassenger } from '../services/moviService';
import { isValidMoviPhone, normalizePhone } from '../utils/phone';

const phoneSchema = z
  .string()
  .min(1)
  .transform((value) => normalizePhone(value))
  .refine((value) => isValidMoviPhone(value), 'Número de teléfono inválido');

@Controller('passengers')
export class PassengersController {
  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: phoneSchema,
        fullName: z.string().min(2),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        password: z.string().min(8),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de registro inválidos', HttpStatus.BAD_REQUEST);
    }

    const fullName =
      parsed.data.fullName.trim() ||
      [parsed.data.firstName, parsed.data.lastName].filter(Boolean).join(' ').trim();

    const result = await registerPassenger(parsed.data.phone, fullName, parsed.data.password);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Registro fallido', HttpStatus.BAD_REQUEST);
    }
    return { user: result.user, authToken: result.authToken };
  }
}
