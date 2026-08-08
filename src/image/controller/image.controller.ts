import { Request, Response, NextFunction } from 'express';
import { ImageService } from '../service/image.service';
import { ImageRequiredError } from '../error/image.error';
import { ImageUploadResponse } from '../dto/image-response';
import { success } from '../../common/responses/api-response';

export class ImageController {
  private readonly imageService = new ImageService();

  // POST /api/v1/image/upload
  // multipart/form-data 형식으로 이미지 최대 3장을 한 번에 받아 S3에 저장 후 URL 목록 반환
  // 클라이언트는 반환된 URL 목록을 보관하다가 견적 요청 제출 시 body에 담아 전송
  uploadImage = async (req: Request, res: Response, next: NextFunction) => {
    try {
      // multer array 미들웨어가 req.files에 파일 목록을 담아줌
      const files = req.files as Express.Multer.File[] | undefined;

      // 파일이 없는 경우 400
      if (!files || files.length === 0) throw new ImageRequiredError();

      // S3 업로드 후 URL 목록 반환
      const imageUrls = await this.imageService.uploadImages(files);

      const response: ImageUploadResponse = { imageUrls };
      return res.status(200).json(success(response));
    } catch (error) {
      next(error);
    }
  };
}
