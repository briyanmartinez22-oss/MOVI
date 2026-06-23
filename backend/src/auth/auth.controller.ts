import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';
import { AuthUser } from '../common/decorators/auth-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import type { AuthPayload } from '../common/guards/jwt-auth.guard';
import { rotateRefreshToken, revokeRefreshToken } from '../lib/refreshToken';
import { signAuthToken } from '../lib/jwt';
import { getMe } from '../services/moviService';
import { requestOtp, verifyOtp } from '../services/otpService';
import {
  forgotPassword,
  loginWithPassword,
  resetPassword,
  setInitialPassword,
} from '../services/auth.service';
import { loginWithOtp } from '../services/moviService';
import { updateUserProfilePhoto } from '../services/users.service';
import { isValidMoviPhone, normalizePhone } from '../utils/phone';

const phoneSchema = z
  .string()
  .min(1)
  .transform((value) => normalizePhone(value))
  .refine((value) => isValidMoviPhone(value), 'Número de teléfono inválido');

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[a-zA-Z]/, 'Debe incluir al menos una letra')
  .regex(/\d/, 'Debe incluir al menos un número');

@Controller('auth')
export class AuthController {
  @Post('request-otp')
  async requestOtp(@Body() body: unknown) {
    const parsed = z.object({ phone: phoneSchema }).safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Teléfono inválido', HttpStatus.BAD_REQUEST);
    }
    const result = await requestOtp(parsed.data.phone);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error OTP', HttpStatus.BAD_REQUEST);
    }
    return { sent: true };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: unknown) {
    const parsed = z
      .object({ phone: phoneSchema, code: z.string().min(4) })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos OTP inválidos', HttpStatus.BAD_REQUEST);
    }
    const result = await verifyOtp(parsed.data.phone, parsed.data.code);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'OTP inválido', HttpStatus.BAD_REQUEST);
    }
    return {
      verified: true,
      isNewUser: result.isNewUser,
      verificationToken: result.verificationToken,
      existingRole: result.existingRole ?? null,
    };
  }

  @Post('login')
  async login(@Body() body: unknown) {
    const passwordLogin = z
      .object({
        phone: phoneSchema,
        password: z.string().min(1, 'La contraseña es requerida'),
      })
      .safeParse(body);

    if (passwordLogin.success) {
      const result = await loginWithPassword(
        passwordLogin.data.phone,
        passwordLogin.data.password
      );
      if (!result.ok) {
        const payload =
          'code' in result && result.code
            ? { error: result.error ?? 'Login fallido', code: result.code }
            : (result.error ?? 'Login fallido');
        throw new HttpException(payload, HttpStatus.BAD_REQUEST);
      }
      return {
        user: result.user,
        authToken: result.authToken,
        refreshToken: result.refreshToken,
      };
    }

    const otpLogin = z
      .object({
        phone: phoneSchema,
        dui: z.string().min(5).optional(),
        code: z.string().min(4),
      })
      .safeParse(body);

    if (!otpLogin.success) {
      const hasPhone = typeof (body as { phone?: unknown })?.phone === 'string';
      const hasPassword = typeof (body as { password?: unknown })?.password === 'string';
      if (hasPhone && hasPassword) {
        throw new HttpException(
          'Teléfono o contraseña inválidos. Verifica el formato (+503 o +1).',
          HttpStatus.BAD_REQUEST
        );
      }
      throw new HttpException('Datos de login inválidos', HttpStatus.BAD_REQUEST);
    }

    const result = await loginWithOtp(
      otpLogin.data.phone,
      otpLogin.data.dui,
      otpLogin.data.code
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Login fallido', HttpStatus.BAD_REQUEST);
    }
    return {
      user: result.user,
      authToken: result.authToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: unknown) {
    const parsed = z.object({ phone: phoneSchema }).safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Teléfono inválido', HttpStatus.BAD_REQUEST);
    }
    const result = await forgotPassword(parsed.data.phone);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al enviar OTP', HttpStatus.BAD_REQUEST);
    }
    return { sent: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: phoneSchema,
        code: z.string().min(4),
        password: passwordSchema,
        confirmPassword: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos de recuperación inválidos', HttpStatus.BAD_REQUEST);
    }
    const result = await resetPassword(
      parsed.data.phone,
      parsed.data.code,
      parsed.data.password,
      parsed.data.confirmPassword
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al restablecer contraseña', HttpStatus.BAD_REQUEST);
    }
    return { reset: true };
  }

  @Post('set-password')
  async setPassword(@Body() body: unknown) {
    const parsed = z
      .object({
        phone: phoneSchema,
        code: z.string().min(4),
        password: passwordSchema,
        confirmPassword: z.string().min(1),
      })
      .safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Datos inválidos', HttpStatus.BAD_REQUEST);
    }
    const result = await setInitialPassword(
      parsed.data.phone,
      parsed.data.code,
      parsed.data.password,
      parsed.data.confirmPassword
    );
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Error al crear contraseña', HttpStatus.BAD_REQUEST);
    }
    return {
      user: result.user,
      authToken: result.authToken,
      refreshToken: result.refreshToken,
    };
  }

  @Post('refresh')
  async refresh(@Body() body: unknown) {
    const parsed = z.object({ refreshToken: z.string().min(10) }).safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Refresh token inválido', HttpStatus.BAD_REQUEST);
    }
    const result = await rotateRefreshToken(parsed.data.refreshToken);
    if (!result.ok) {
      throw new HttpException(result.error ?? 'Token inválido', HttpStatus.UNAUTHORIZED);
    }
    return {
      authToken: signAuthToken({ userId: result.userId, role: result.role }),
      refreshToken: result.refreshToken,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@AuthUser() auth: AuthPayload) {
    const user = await getMe(auth.userId);
    if (!user) {
      throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  @Post('me/photo')
  @UseGuards(JwtAuthGuard)
  async updatePhoto(@AuthUser() auth: AuthPayload, @Body() body: unknown) {
    const parsed = z.object({ profilePhoto: z.string().min(1) }).safeParse(body);
    if (!parsed.success) {
      throw new HttpException('Foto inválida', HttpStatus.BAD_REQUEST);
    }
    return updateUserProfilePhoto(auth.userId, parsed.data.profilePhoto);
  }

  @Post('logout')
  async logout(@Body() body: unknown) {
    const parsed = z.object({ refreshToken: z.string().optional() }).safeParse(body ?? {});
    if (parsed.success && parsed.data.refreshToken) {
      await revokeRefreshToken(parsed.data.refreshToken);
    }
    return { loggedOut: true };
  }
}
