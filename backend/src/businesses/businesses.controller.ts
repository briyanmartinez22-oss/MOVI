import { Body, Controller, HttpException, HttpStatus, Post } from '@nestjs/common';
import { z } from 'zod';
import { registerBusiness } from '../services/moviService';

@Controller('businesses')
export class BusinessesController {
  @Post('register')
  async register(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: z.string().min(8),
        fullName: z.string().min(2),
        dui: z.string().min(5),
        businessName: z.string().min(2),
        businessType: z.string().min(1),
        businessPhone: z.string().min(8),
        nit: z.string().optional(),
        latitude: z.number(),
        longitude: z.number(),
        addressLabel: z.string().min(2),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de negocio inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await registerBusiness(
      parsed.data.phone,
      parsed.data.fullName,
      parsed.data.dui,
      parsed.data
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Registro fallido', HttpStatus.BAD_REQUEST);
    }
    return { user: result.user, business: result.business, authToken: result.authToken };
  }
}
