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

// GET /detail - 유효하지 않은 status/page/size 쿼리 값
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

// GET /:reservationId - 유효하지 않은 예약 id (path variable)
export class InvalidReservationIdError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_RESERVATION_ID',
      statusCode: 400,
      message: '유효하지 않은 예약 id입니다.',
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

// GET /:reservationId, DELETE /:reservationId - 존재하지 않거나 본인 소유가 아닌 예약 id
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

// DELETE /:reservationId - 취소 request body(reason) 값 검증 실패
export class ReservationCancelValidationError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'RESERVATION_CANCEL_VALIDATION_FAILED',
      statusCode: 400,
      message: '취소 사유를 입력해주세요.',
      data,
    });
  }
}

// DELETE /:reservationId - 이미 취소되었거나 완료된 예약은 취소할 수 없음
export class ReservationAlreadyFinalizedError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'RESERVATION_ALREADY_FINALIZED',
      statusCode: 409,
      message: '이미 취소되었거나 완료된 예약은 취소할 수 없습니다.',
      data,
    });
  }
}

// repository.create() 내부에서 견적 row 락으로 동시 예약을 감지했을 때 던지는 신호용 에러.
// 진짜 Prisma 에러가 아니므로(image.error.ts의 InvalidImageTypeError와 동일 패턴) 일반
// Error를 상속한다. service에서 instanceof로 판별해 AlreadyReservedError(409)로 변환한다.
export class ReservationLockConflictError extends Error {
  constructor() {
    super('동시 예약 요청이 감지됐습니다.');
    this.name = 'ReservationLockConflictError';
  }
}
