import { AppError } from '../../common/errors/app.error';

// 리뷰 도메인 공통 - path 값(reviewId 등) 검증 실패
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

// POST /api/v1/reviews, PATCH /api/v1/reviews/:reviewId - body(shopId/rating/content 등) 검증 실패
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

// POST /api/v1/reviews - 해당 샵에서 완료된 예약이 없어 리뷰를 작성할 수 없음
export class ReviewNotEligibleError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_NOT_ELIGIBLE',
      statusCode: 404,
      message: '해당 샵에서 시술을 완료한 예약이 없어 리뷰를 작성할 수 없어요.',
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

// POST /api/v1/reviews - 샵 1곳당 리뷰는 1개까지만 작성 가능
export class ReviewAlreadyExistsError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REVIEW_ALREADY_EXISTS',
      statusCode: 409,
      message: '이미 리뷰를 작성한 매장입니다.',
      data,
    });
  }
}
