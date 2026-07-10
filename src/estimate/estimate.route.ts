import { Router } from 'express';
import { EstimateController } from './controller/estimate.controller';

const estimateController = new EstimateController();
const router = Router();

/**
 * @openapi
 * /api/v1/estimate:
 *   post:
 *     summary: 견적 요청 생성
 *     tags:
 *       - Estimate
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
 *                 example: "2026-07-10"
 *               endDate:
 *                 type: string
 *                 example: "2026-07-20"
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
 *     responses:
 *       201:
 *         description: 견적 요청 생성 성공
 *       400:
 *         description: 요청 값 유효성 검사 실패
 */
router.post('/', estimateController.createEstimate);

/**
 * @openapi
 * /api/v1/estimate:
 *   get:
 *     summary: 상태별 견적 목록 조회
 *     tags:
 *       - Estimate
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [MATCHING, COMPLETED, EXPIRED, ALL]
 *           default: ALL
 *         description: 조회할 견적 상태 (기본값 ALL)
 *     responses:
 *       200:
 *         description: 견적 목록 조회 성공
 *       400:
 *         description: 요청 값 유효성 검사 실패
 */
router.get('/', estimateController.getEstimatesByStatus);

export default router;
