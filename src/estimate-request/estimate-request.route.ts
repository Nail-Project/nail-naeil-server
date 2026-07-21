import { Router } from 'express';
import { EstimateRequestController } from './controller/estimate-request.controller';
import { EstimateRequestService } from './service/estimate-request.service';

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

estimateRequestRouter.post('/', controller.createEstimateRequest);
estimateRequestRouter.get('/:status', controller.getEstimatesByStatus);

export default estimateRequestRouter;
