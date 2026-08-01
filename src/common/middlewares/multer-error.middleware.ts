import { Request, Response, NextFunction } from 'express';
import { Multer, MulterError } from 'multer';
import { PhotoUploadFailedError } from '../errors/common.error';
import { ImageRequiredError, InvalidImageFormatError, InvalidImageTypeError } from '../../image/error/image.error';

// multer 에러를 커스텀 에러로 변환하는 공통 핸들러
//
// 에러 코드별 매핑:
// · LIMIT_FILE_SIZE     : 파일 크기 초과 → 400 IMAGE_REQUIRED
// · LIMIT_FILE_COUNT    : 파일 수 초과 → 400 IMAGE_REQUIRED (클라이언트 입력 오류)
// · LIMIT_UNEXPECTED_FILE: 예상치 못한 필드명 → 400 IMAGE_REQUIRED (클라이언트 입력 오류)
// · 그 외 MulterError  : 서버 처리 오류 → 500 PHOTO_UPLOAD_FAILED
// · InvalidImageTypeError: MIME 타입 위조/불일치 → 400 INVALID_IMAGE_FORMAT
const handleMulterError = (err: unknown, next: NextFunction) => {
  if (!err) return next();

  if (err instanceof MulterError) {
    const clientErrors = ['LIMIT_FILE_SIZE', 'LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'];
    if (clientErrors.includes(err.code)) return next(new ImageRequiredError());
    return next(new PhotoUploadFailedError());
  }

  if (err instanceof InvalidImageTypeError) {
    return next(new InvalidImageFormatError());
  }

  next(new PhotoUploadFailedError());
};

// 단일 파일 업로드 미들웨어 래퍼
export const wrapMulter =
  (upload: Multer, fieldName: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err) => handleMulterError(err, next));
  };

// 다중 파일 업로드 미들웨어 래퍼 (최대 maxCount개)
export const wrapMulterArray =
  (upload: Multer, fieldName: string, maxCount: number) =>
  (req: Request, res: Response, next: NextFunction) => {
    upload.array(fieldName, maxCount)(req, res, (err) => handleMulterError(err, next));
  };
