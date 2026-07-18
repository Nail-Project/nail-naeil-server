import { Router } from 'express';
import { EstimateResponseController } from './controller/estimate-response.controller';
import { PrismaEstimateResponseRepository } from './repository/estimate-response.repository';
import { EstimateResponseService } from './service/estimate-response.service';

const repository = new PrismaEstimateResponseRepository();
const service = new EstimateResponseService(repository);
const controller = new EstimateResponseController(service);
const estimateResponseRouter = Router();

/**
 * @openapi
 * /api/v1/estimate/result/{request_id}:
 *   get:
 *     summary: 견적 요청에 도착한 견적 결과 목록 조회
 *     tags: [Estimate Response]
 *     parameters:
 *       - in: path
 *         name: request_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 견적 결과 목록 조회 성공
 *       400:
 *         description: 잘못된 견적 요청 식별자
 */
/**
 * @openapi
 * /api/v1/estimate:
 *   post:
 *     summary: 안드로이드에서 전달한 샵 견적 응답 문자 접수
 *     tags: [Estimate Response]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [source, messageId, rawPayload]
 *             properties:
 *               source: { type: string, example: "android-device-a1b2c3" }
 *               messageId: { type: string, example: "android-sms-1042" }
 *               rawPayload:
 *                 type: object
 *                 additionalProperties: true
 *                 example:
 *                   address: "01012345678"
 *                   body: "젤 제거 포함 55000원, 7월 20일 오후 2시 가능해요."
 *                   receivedAt: "2026-07-18T13:20:38+09:00"
 *     responses:
 *       202:
 *         description: 견적 응답 문자 접수 성공
 *       400:
 *         description: 견적 응답 문자 형식 오류
 */
/**
 * @openapi
 * /api/v1/estimate/{proposal_id}/time:
 *   get:
 *     summary: 샵 견적의 예약 가능 시간 조회
 *     tags: [Estimate Response]
 *     parameters:
 *       - in: path
 *         name: proposal_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 예약 가능 시간 조회 성공
 *       404:
 *         description: 견적 응답을 찾을 수 없음
 */
/**
 * @openapi
 * /api/v1/estimate/{proposal_id}/detail:
 *   get:
 *     summary: 샵 견적 상세 조회
 *     tags: [Estimate Response]
 *     parameters:
 *       - in: path
 *         name: proposal_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 샵 견적 상세 조회 성공
 *       404:
 *         description: 견적 응답을 찾을 수 없음
 */
const registerRoutes = (router: Router, routeController: EstimateResponseController): Router => {
  router.get('/result/:request_id', routeController.getList);
  router.post('/', routeController.receive);
  router.get('/:proposal_id/time', routeController.getProposalTimes);
  router.get('/:proposal_id/detail', routeController.getDetail);

  return router;
};

registerRoutes(estimateResponseRouter, controller);

export default estimateResponseRouter;

export const createEstimateResponseRouter = (
  estimateResponseService: EstimateResponseService,
): Router => {
  const injectedController = new EstimateResponseController(estimateResponseService);

  return registerRoutes(Router(), injectedController);
};
