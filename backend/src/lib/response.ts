import type { Response } from 'express';

export interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export function ok<T>(res: Response, data: T, status = 200) {
  const body: ApiResponse<T> = { ok: true, data };
  return res.status(status).json(body);
}

export function fail(res: Response, error: string, status = 400) {
  const body: ApiResponse<never> = { ok: false, error };
  return res.status(status).json(body);
}
