import { AppError } from '../../common/errors/app.error';

// POST / - 요청 바디 필드 누락 또는 타입 불일치
export class EstimateRequestValidationError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_VALIDATION_FAILED',
      statusCode: 400,
      message: '견적 요청 정보를 모두 입력해주세요.',
      data,
    });
  }
}

// GET /:status - 허용되지 않은 status 값 (MATCHING | COMPLETED | EXPIRED | ALL 외)
// GET /result/:request_id, GET /:proposal_id/time - 경로 파라미터가 양의 정수가 아닌 경우
export class InvalidEstimateRequestError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_ESTIMATE_REQUEST',
      statusCode: 400,
      message: '유효하지 않은 요청입니다.',
      data,
    });
  }
}

// GET /result/:request_id - 존재하지 않는 견적 요청 ID
export class EstimateRequestNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_NOT_FOUND',
      statusCode: 404,
      message: '해당 견적 요청을 찾을 수 없습니다.',
      data,
    });
  }
}

// GET /result/:request_id - 요청자와 로그인한 사용자가 다를 때
// TODO: [yej] 로그인 구현 후 활성화
export class EstimateRequestForbiddenError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_FORBIDDEN',
      statusCode: 403,
      message: '접근 권한이 없습니다.',
      data,
    });
  }
}
