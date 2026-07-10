import { AppError } from '../../common/errors/app.error';


// POST / - 견적 request 값 부족
export class EstimateValidationError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_VALIDATION_FAILED',
      statusCode: 400,
      message: '견적 요청 정보를 모두 입력해주세요.',
      data,
    });
  }
}

// GET /:status - 유효하지 않은 상태값
export class InvalidEstimateStatusError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_ESTIMATE_STATUS',
      statusCode: 400,
      message: '유효하지 않은 상태값입니다.',
      data,
    });
  }
}