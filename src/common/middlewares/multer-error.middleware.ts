import { Request, Response, NextFunction } from 'express';
import { Multer, MulterError } from 'multer';
import { PhotoUploadFailedError } from '../errors/common.error';
import { ImageRequiredError, InvalidImageTypeError } from '../../image/error/image.error';

// multer 에러를 커스텀 에러로 변환하는 공통 핸들러
const handleMulterError = (err: unknown, next: NextFunction) => {
  if (!err) return next();

  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return next(new ImageRequiredError());
    return next(new PhotoUploadFailedError());
  }

  if (err instanceof InvalidImageTypeError) {
    return next(new ImageRequiredError());
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
