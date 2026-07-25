import { AppError } from '../../common/errors/app.error';

// POST / - 예약 request 값 검증 실패
export class ReservationValidationError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'RESERVATION_VALIDATION_FAILED',
      statusCode: 400,
      message: '예약 요청 정보를 모두 입력해주세요.',
      data,
    });
  }
}

// GET /detail - 유효하지 않은 status/page/size 쿼리 값, GET /:reservationId - 유효하지 않은 예약 id
export class InvalidReservationRequestError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_RESERVATION_REQUEST',
      statusCode: 400,
      message: '유효하지 않은 요청입니다.',
      data,
    });
  }
}

// POST / - 존재하지 않는 견적(제안) id
export class ProposalNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'PROPOSAL_NOT_FOUND',
      statusCode: 404,
      message: '해당 견적 또는 예약 시간을 찾을 수 없습니다.',
      data,
    });
  }
}

// POST / - 존재하지 않는 예약 가능 시간 id
export class ProposalTimeNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'PROPOSAL_TIME_NOT_FOUND',
      statusCode: 404,
      message: '해당 견적 또는 예약 시간을 찾을 수 없습니다.',
      data,
    });
  }
}

// POST / - 이미 예약된 견적에 대한 중복 예약 시도
export class AlreadyReservedError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ALREADY_RESERVED',
      statusCode: 409,
      message: '이미 예약된 시간입니다.',
      data,
    });
  }
}

// GET /:reservationId - 존재하지 않거나 본인 소유가 아닌 예약 id
export class ReservationNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'RESERVATION_NOT_FOUND',
      statusCode: 404,
      message: '존재하지 않는 예약입니다.',
      data,
    });
  }
}
