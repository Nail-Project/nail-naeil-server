import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/app-error';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.code, message: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ code: 'INTERNAL_SERVER_ERROR', message: '서버 오류가 발생했습니다.' });
}