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

// GET /result/:requestId - 요청자와 현재 사용자가 다를 때(견적 데이터 확인 권한 없는 유저의 접근)
export class EstimateForbiddenError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_FORBIDDEN',
      statusCode: 403,
      message: '접근 권한이 없습니다.',
      data,
    });
  }
}

// GET /result/:requestId - 존재하지 않는 견적 요청 id
export class EstimateNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_NOT_FOUND',
      statusCode: 404,
      message: '해당 견적 요청을 찾을 수 없습니다.',
      data,
    });
  }
}