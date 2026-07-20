import { Request, Response, NextFunction } from 'express';
import { ImageService } from '../service/image.service';
import { ImageRequiredError } from '../error/image.error';
import { ImageUploadResponse } from '../dto/image-response';
import { success } from '../../common/responses/api-response';

export class ImageController {
  private readonly imageService = new ImageService();

  // POST /api/v1/image/upload
  // multipart/form-data 형식으로 이미지 파일을 받아 로컬(추후 S3)에 저장 후 URL 반환
  // 클라이언트는 반환된 URL을 보관하다가 견적 요청 제출 시 body에 담아 전송
  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // multer 미들웨어가 req.file에 파싱한 파일 정보를 담아줌
      // (multer 미들웨어 등록은 image.route.ts에서 처리)
      const file = req.file;

      // 파일이 없는 경우 400 - 에러 핸들러로 위임
      if (!file) throw new ImageRequiredError();

      // 서비스 레이어에 파일 전달 → uuid 기반 파일명으로 저장 후 접근 URL 반환
      const imageUrl = await this.imageService.uploadImage(file);

      const response: ImageUploadResponse = { imageUrl };
      return res.status(200).json(success(response));
    } catch (error) {
      next(error);
    }
  };
}
