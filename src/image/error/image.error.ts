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
