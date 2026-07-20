import { AppError } from '../../common/errors/app.error';

export class InvalidEstimateResponseError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_ESTIMATE_RESPONSE',
      statusCode: 400,
      message: '견적 응답 형식이 올바르지 않아요.',
      data,
    });
  }
}

export class EstimateResponseNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_RESPONSE_NOT_FOUND',
      statusCode: 404,
      message: '견적 응답을 찾을 수 없어요.',
      data,
    });
  }
}
