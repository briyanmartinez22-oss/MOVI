import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const error =
        typeof body === 'string'
          ? body
          : typeof body === 'object' && body !== null && 'message' in body
            ? Array.isArray((body as { message: unknown }).message)
              ? (body as { message: string[] }).message.join(', ')
              : String((body as { message: unknown }).message)
            : exception.message;

      response.status(status).json({ ok: false, error });
      return;
    }

    const message =
      exception instanceof Error ? exception.message : 'Error interno';
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      ok: false,
      error: message,
    });
  }
}
