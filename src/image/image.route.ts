import { Router } from 'express';
import { ImageController } from './controller/image.controller';
import { ImageService } from './service/image.service';
import { wrapMulterArray } from '../common/middlewares/multer-error.middleware';
import { authMiddleware } from '../common/middlewares/auth.middleware';

const imageRouter = Router();
const imageController = new ImageController();
const imageService = new ImageService();

const upload = imageService.getMulter();

/**
 * @openapi
 * /api/v1/image/upload:
 *   post:
 *     summary: 이미지 업로드
 *     description: |
 *       견적 요청 제출 전 이미지를 미리 서버에 업로드하고 URL을 반환한다.
 *       클라이언트는 반환된 URL을 보관하다가 견적 요청 제출 시 body에 담아 전송한다.
 *       - 허용 형식: jpg, png, webp 등 image/* 형식
 *       - 최대 크기: 10MB
 *       - form-data 필드명: image (고정)
 *     tags:
 *       - Image
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - images
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 업로드할 이미지 파일 (최대 3장, 장당 10MB)
 *     responses:
 *       200:
 *         description: 업로드 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: SUCCESS
 *                 error:
 *                   type: object
 *                   nullable: true
 *                   example: null
 *                 success:
 *                   type: object
 *                   properties:
 *                     imageUrls:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["https://nail-naeil-images.s3.ap-northeast-2.amazonaws.com/images/2026-08-01/uuid.jpg"]
 *       400:
 *         description: 파일 미첨부 / 이미지 아닌 파일 / 크기 초과
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: FAIL
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: IMAGE_REQUIRED
 *                     message:
 *                       type: string
 *                       example: 이미지 파일이 필요합니다.
 *                     data:
 *                       nullable: true
 *                       example: null
 *                 success:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             examples:
 *               unauthorized: { value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null } }
 *               tokenExpired: { value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null } }
 *               tokenInvalid: { value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null } }
 *       500:
 *         description: 서버 오류 (파일 저장 실패)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: FAIL
 *                 error:
 *                   type: object
 *                   properties:
 *                     code:
 *                       type: string
 *                       example: PHOTO_UPLOAD_FAILED
 *                     message:
 *                       type: string
 *                       example: 사진을 업로드하지 못했어요. 다시 시도해주세요.
 *                     data:
 *                       nullable: true
 *                       example: null
 *                 success:
 *                   nullable: true
 *                   example: null
 */
// wrapMulter: multer 실행 + 에러 발생 시 커스텀 에러로 변환해 공통 핸들러로 위임
// authMiddleware를 먼저 걸어 비로그인 사용자의 무제한 업로드(스토리지 어뷰징)를 막는다.
imageRouter.post(
  '/upload',
  authMiddleware,
  wrapMulterArray(upload, 'images', 3),
  imageController.uploadImage,
);

export default imageRouter;
