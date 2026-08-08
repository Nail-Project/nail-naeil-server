import { AppError } from '../../common/errors/app.error';

// POST /:reservationId/review - 유효하지 않은 예약 id (path variable)
export class InvalidReviewReservationIdError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_REVIEW_RESERVATION_ID',
      statusCode: 400,
      message: '유효하지 않은 예약 id입니다.',
      data,
    });
  }
}

// POST /:reservationId/review - 별점/내용 값 검증 실패
export class ReviewValidationError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_VALIDATION_FAILED',
      statusCode: 400,
      message: '별점과 리뷰 내용을 확인해주세요.',
      data,
    });
  }
}

// POST /:reservationId/review - 존재하지 않거나 본인 소유가 아닌 예약
export class ReviewReservationNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_RESERVATION_NOT_FOUND',
      statusCode: 404,
      message: '존재하지 않는 예약입니다.',
      data,
    });
  }
}

// POST /:reservationId/review - 시술이 완료된 예약만 리뷰 작성 가능
export class ReviewNotAllowedError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_NOT_ALLOWED',
      statusCode: 409,
      message: '시술이 완료된 예약만 리뷰를 작성할 수 있습니다.',
      data,
    });
  }
}

// POST /:reservationId/review - 예약 1건당 리뷰는 1개까지만 작성 가능
export class ReviewAlreadyExistsError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_ALREADY_EXISTS',
      statusCode: 409,
      message: '이미 리뷰를 작성한 예약입니다.',
      data,
    });
  }
}
