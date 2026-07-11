import { Router } from 'express';
import { ImageController } from './controller/image.controller';
import { ImageService } from './service/image.service';

const imageRouter = Router();
const imageController = new ImageController();
const imageService = new ImageService();

// multer 미들웨어 - 파일 파싱 및 저장을 처리 후 req.file에 결과를 담아줌
// single('image') → form-data의 'image' 필드에서 파일 1개를 받음
const upload = imageService.getMulter();

// POST /api/v1/image/upload
imageRouter.post('/upload', upload.single('image'), imageController.uploadImage);

export default imageRouter;
