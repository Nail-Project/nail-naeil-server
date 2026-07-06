import { AppError } from './app.error';

export class RequiredFieldMissingError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'REQUIRED_FIELD_MISSING',
      statusCode: 400,
      message: '필수 정보를 입력해주세요.',
      data,
    });
  }
}

export class LocationRequiredError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'LOCATION_REQUIRED',
      statusCode: 400,
      message: '주변 샵을 찾기 위해 위치가 필요해요.',
      data,
    });
  }
}

// 사진 업로드, 견적 요청, 예약 실패는 클라이언트 입력 문제가 아니라
// S3 업로드나 처리 과정에서 발생하는 실패라 500으로 분류한다.
export class PhotoUploadFailedError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'PHOTO_UPLOAD_FAILED',
      statusCode: 500,
      message: '사진을 업로드하지 못했어요. 다시 시도해주세요.',
      data,
    });
  }
}

export class EstimateRequestFailedError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'ESTIMATE_REQUEST_FAILED',
      statusCode: 500,
      message: '견적 요청을 보내지 못했어요. 다시 시도해주세요.',
      data,
    });
  }
}

export class ReservationFailedError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'RESERVATION_FAILED',
      statusCode: 500,
      message: '예약을 완료하지 못했어요. 다시 시도해주세요.',
      data,
    });
  }
}

export class InternalServerError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INTERNAL_SERVER_ERROR',
      statusCode: 500,
      message: '알 수 없는 오류가 발생했어요. 잠시 후 다시 시도해주세요.',
      data,
    });
  }
}
