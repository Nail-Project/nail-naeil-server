import { Router } from 'express';
import { EstimateRequestController } from './controller/estimate-request.controller';
import { EstimateRequestService } from './service/estimate-request.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

const service = new EstimateRequestService();
const controller = new EstimateRequestController(service);
const estimateRequestRouter = Router();

/**
 * @openapi
 * /api/v1/estimate:
 *   post:
 *     summary: 견적 요청 생성
 *     description: |
 *       사용자가 네일 견적 요청을 생성한다.
 *       이미지는 image 도메인에서 미리 업로드 후 URL을 받아 함께 전달한다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Estimate Request
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - nailType
 *               - removalType
 *               - startDate
 *               - endDate
 *               - preferredTime
 *               - recommendType
 *             properties:
 *               nailType:
 *                 type: string
 *                 enum: [HAND, PEDICURE, BOTH]
 *               removalType:
 *                 type: string
 *                 enum: [EXTENSION, PARTS, BASIC, NONE]
 *               startDate:
 *                 type: string
 *                 example: "2026-08-01"
 *               endDate:
 *                 type: string
 *                 example: "2026-08-07"
 *               preferredTime:
 *                 type: string
 *                 enum: [AM, PM, EVENING, ANY]
 *               recommendType:
 *                 type: string
 *                 enum: [BALANCED, CLOSE, WIDE, CHEAP]
 *               description:
 *                 type: string
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["http://localhost:3000/uploads/2026-07-20/uuid.jpg"]
 *               shopIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1]
 *                 description: 견적을 보낼 샵 ID 목록 (주변 샵 조회 API에서 받은 값)
 *     responses:
 *       201:
 *         description: 견적 요청 생성 성공
 *       400:
 *         description: 필수 필드 누락 또는 타입 불일치
 */

/**
 * @openapi
 * /api/v1/estimate/{status}:
 *   get:
 *     summary: 상태별 견적 요청 목록 조회
 *     description: |
 *       사용자의 견적 요청을 상태별로 조회한다.
 *       status=ALL이면 상태 필터 없이 전체를 조회한다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Estimate Request
 *     parameters:
 *       - in: path
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [MATCHING, COMPLETED, EXPIRED, ALL]
 *     responses:
 *       200:
 *         description: 목록 조회 성공
 *       400:
 *         description: 유효하지 않은 status 값
 */

// 두 엔드포인트 모두 로그인한 사용자만 접근 가능하다.
// authMiddleware가 Authorization: Bearer 헤더를 검증하고 req.userId를 주입한다.
estimateRequestRouter.post('/', authMiddleware, controller.createEstimateRequest);
estimateRequestRouter.get('/:status', authMiddleware, controller.getEstimatesByStatus);

export default estimateRequestRouter;
