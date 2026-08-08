import { AppError } from '../../common/errors/app.error';

// 리뷰 도메인 공통 - path/query 값(reviewId, shopId, cursor, size 등) 검증 실패
export class InvalidReviewRequestError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_REVIEW_REQUEST',
      statusCode: 400,
      message: '요청 값을 확인해주세요.',
      data,
    });
  }
}

// POST /api/v1/reviews, PATCH /api/v1/reviews/:reviewId - body(rating/content 등) 검증 실패
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

// POST /api/v1/reviews - 존재하지 않거나 본인 소유가 아닌 예약
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

// PATCH·DELETE /api/v1/reviews/:reviewId - 존재하지 않거나 본인이 작성한 리뷰가 아님
export class ReviewNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_NOT_FOUND',
      statusCode: 404,
      message: '존재하지 않는 리뷰입니다.',
      data,
    });
  }
}

// GET /api/v1/shops/:shopId/reviews - 존재하지 않는 샵
export class ReviewShopNotFoundError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_SHOP_NOT_FOUND',
      statusCode: 404,
      message: '존재하지 않는 샵입니다.',
      data,
    });
  }
}

// POST /api/v1/reviews - 시술이 완료된 예약만 리뷰 작성 가능
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

// POST /api/v1/reviews - 예약 1건당 리뷰는 1개까지만 작성 가능
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
