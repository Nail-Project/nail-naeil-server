import { AppError } from '../../common/errors/app.error';

// 이미지 파일이 첨부되지 않은 경우 (multipart/form-data에 file 필드 없음)
export class ImageRequiredError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'IMAGE_REQUIRED',
      statusCode: 400,
      message: '이미지 파일이 필요합니다.',
      data,
    });
  }
}

// 이미지 형식이 유효하지 않은 경우
// · MIME 타입이 image/*가 아닌 경우 (fileFilter에서 InvalidImageTypeError → 이 에러로 변환)
// · 매직 바이트 검사에서 실제 이미지 파일이 아닌 경우 (uploadImages에서 직접 throw)
export class InvalidImageFormatError extends AppError {
  constructor(data?: unknown) {
    super({
      code: 'INVALID_IMAGE_FORMAT',
      statusCode: 400,
      message: '이미지 파일만 업로드할 수 있습니다.',
      data,
    });
  }
}

// multer fileFilter 내부에서 던지는 신호용 에러
// multer는 fileFilter의 cb에 Error를 넣어야 전달되므로 일반 Error를 사용
// wrapMulter에서 instanceof로 판별해 InvalidImageFormatError(400)로 변환
export class InvalidImageTypeError extends Error {
  constructor() {
    super('이미지 파일만 업로드할 수 있습니다.');
    this.name = 'InvalidImageTypeError';
  }
}
