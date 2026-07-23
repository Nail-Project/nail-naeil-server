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

// fileFilter에서 이미지 타입이 아닌 파일을 걸러낼 때 던지는 에러
// wrapMulter에서 instanceof로 판별해 ImageRequiredError(400)로 변환
// 문자열 비교 대신 클래스 타입으로 판별해 메시지 변경 시 오작동 방지
export class InvalidImageTypeError extends Error {
  constructor() {
    super('이미지 파일만 업로드할 수 있습니다.');
    this.name = 'InvalidImageTypeError';
  }
}
