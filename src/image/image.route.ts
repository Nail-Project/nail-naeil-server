import { Router } from 'express';
import { ImageController } from './controller/image.controller';
import { ImageService } from './service/image.service';
import { wrapMulter } from '../common/middlewares/multer-error.middleware';

const imageRouter = Router();
const imageController = new ImageController();
const imageService = new ImageService();

const upload = imageService.getMulter();

// POST /api/v1/image/upload
// wrapMulter: multer 실행 + 에러 발생 시 커스텀 에러로 변환해 공통 핸들러로 위임
imageRouter.post('/upload', wrapMulter(upload, 'image'), imageController.uploadImage);

export default imageRouter;
