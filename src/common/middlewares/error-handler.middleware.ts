import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app.error';
import { InternalServerError } from '../errors/common.error';
import type { ApiErrorResponse } from '../responses/api-response';

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (!(err instanceof AppError)) {
    console.error(err);
  }

  const appError = err instanceof AppError ? err : new InternalServerError();

  const response: ApiErrorResponse = {
    resultType: 'FAIL',
    error: {
      code: appError.code,
      message: appError.message,
      data: appError.data,
    },
    success: null,
  };

  res.status(appError.statusCode).json(response);
};
