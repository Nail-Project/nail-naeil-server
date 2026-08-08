import type { ErrorRequestHandler } from 'express';
import { AppError } from '../errors/app.error';
import { InternalServerError, InvalidRequestError } from '../errors/common.error';
import type { ApiErrorResponse } from '../responses/api-response';

// express.json() 등 미들웨어가 던지는 에러에는 AppError는 아니지만
// statusCode/status 속성이 실려 있는 경우가 있어, 이를 보존해 4xx를 500으로 뭉개지 않는다.
const getKnownStatusCode = (err: unknown): number | undefined => {
  if (typeof err !== 'object' || err === null) {
    return undefined;
  }

  const candidate = err as { statusCode?: unknown; status?: unknown };
  const statusCode = candidate.statusCode ?? candidate.status;

  return typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500
    ? statusCode
    : undefined;
};

const toAppError = (err: unknown): AppError => {
  if (err instanceof AppError) {
    return err;
  }

  const knownStatusCode = getKnownStatusCode(err);
  if (knownStatusCode !== undefined) {
    return new InvalidRequestError(knownStatusCode);
  }

  return new InternalServerError();
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, next) => {
  if (res.headersSent) {
    next(err);
    return;
  }

  const appError = toAppError(err);
  const isServerError = appError.statusCode >= 500;

  if (isServerError) {
    console.error(err);
  }

  const response: ApiErrorResponse = {
    resultType: 'FAIL',
    error: {
      code: appError.code,
      message: appError.message,
      // 5xx의 data에는 원본 에러(Prisma 에러 등 내부 정보)가 실려올 수 있어 응답에 노출하지
      // 않는다. 원본 에러는 위 console.error(err)로만 남긴다.
      data: isServerError ? null : appError.data,
    },
    success: null,
  };

  res.status(appError.statusCode).json(response);
};
