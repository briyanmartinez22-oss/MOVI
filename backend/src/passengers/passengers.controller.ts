import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { z } from 'zod';
import { registerPassenger } from '../services/moviService';

@Controller('passengers')
export class PassengersController {
  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: z.string().min(8),
        dui: z.string().min(5),
        fullName: z.string().min(2),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de registro inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await registerPassenger(
      parsed.data.phone,
      parsed.data.dui,
      parsed.data.fullName
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Registro fallido', HttpStatus.BAD_REQUEST);
    }
    return { user: result.user, authToken: result.authToken };
  }
}
