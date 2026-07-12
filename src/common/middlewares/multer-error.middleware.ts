import { Request, Response, NextFunction } from 'express';
import { Multer, MulterError } from 'multer';
import { PhotoUploadFailedError } from '../errors/common.error';
import { ImageRequiredError, InvalidImageTypeError } from '../../image/error/image.error';

// multer 미들웨어 실행 후 에러를 커스텀 에러로 변환해 공통 에러 핸들러로 넘김
// multer 쓰는 라우터에서 upload.single() 대신 wrapMulter(upload, 'fieldName') 사용
export const wrapMulter =
  (upload: Multer, fieldName: string) =>
  (req: Request, res: Response, next: NextFunction) => {
    upload.single(fieldName)(req, res, (err) => {
      if (!err) return next();

      if (err instanceof MulterError) {
        // 파일 크기 초과
        if (err.code === 'LIMIT_FILE_SIZE') return next(new ImageRequiredError());
        // 그 외 multer 에러 (필드명 불일치 등)
        return next(new PhotoUploadFailedError());
      }

      // fileFilter에서 던진 에러 (이미지 아닌 파일) - instanceof로 안전하게 판별
      if (err instanceof InvalidImageTypeError) {
        return next(new ImageRequiredError());
      }

      // 그 외 예상치 못한 에러
      next(new PhotoUploadFailedError());
    });
  };
