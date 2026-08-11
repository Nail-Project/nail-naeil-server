import { Router } from 'express';
import { EstimateResponseController } from './controller/estimate-response.controller';
import { PrismaEstimateResponseRepository } from './repository/estimate-response.repository';
import { EstimateResponseService } from './service/estimate-response.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';
import { smsWebhookAuth } from './middlewares/sms-webhook-auth.middleware';

const repository = new PrismaEstimateResponseRepository();
const service = new EstimateResponseService(repository);
const controller = new EstimateResponseController(service);
const estimateResponseRouter = Router();

/**
 * @openapi
 * /api/v1/estimate/result/{request_id}:
 *   get:
 *     summary: 견적 요청에 도착한 견적 결과 목록 조회
 *     security:
 *       - bearerAuth: []
 *     tags: [Estimate Response]
 *     parameters:
 *       - in: path
 *         name: request_id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: sort
 *         required: false
 *         description: 추천순, 최저가순, 가까운순, 가장 빠른 예약 가능 시간순 정렬
 *         schema:
 *           type: string
 *           enum: [RECOMMENDED, LOWEST_PRICE, NEAREST, EARLIEST_AVAILABLE]
 *           default: RECOMMENDED
 *     responses:
 *       200:
 *         description: 견적 결과 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: SUCCESS
 *                 error:
 *                   nullable: true
 *                   example: null
 *                 success:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: integer
 *                       example: 1
 *                     title:
 *                       type: string
 *                       nullable: true
 *                       description: 견적 제목. 예) "8/3 패디 견적"
 *                       example: "8/3 패디 견적"
 *                     responses:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           shop:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               address:
 *                                 type: string
 *                               latitude:
 *                                 type: number
 *                                 example: 37.4979
 *                               longitude:
 *                                 type: number
 *                                 example: 127.0276
 *                               rating:
 *                                 type: number
 *                                 example: 4.8
 *                               reviewCount:
 *                                 type: integer
 *                                 example: 120
 *                           totalPrice:
 *                             type: integer
 *                             nullable: true
 *                             description: 시술 불가 응답이면 null
 *                             example: 55000
 *                           distanceMeters:
 *                             type: integer
 *                             nullable: true
 *                             description: 견적 요청 당시 좌표가 없으면 null
 *                           isLowestPrice:
 *                             type: boolean
 *                           isRemovalIncluded:
 *                             type: boolean
 *                             description: 샵이 제거비가 총액에 포함됐다고 명시한 경우 true
 *                           removalPrice:
 *                             type: integer
 *                             nullable: true
 *                             description: 샵이 제거 금액을 별도로 명시한 경우에만 제공
 *                             example: null
 *                           estimatedDurationMinutes:
 *                             type: integer
 *                             description: 예상 시술 소요 시간. 샵이 명시하지 않으면 60분
 *                             example: 60
 *                           canProvideService:
 *                             type: boolean
 *                             description: 시술 가능 여부
 *                           status:
 *                             type: string
 *                             enum: [SUBMITTED, ACCEPTED, REJECTED]
 *                           proposalDateTimes:
 *                             type: array
 *                             items:
 *                               type: string
 *                               format: date-time
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     waitingShops:
 *                       type: array
 *                       description: 아직 견적 응답을 보내지 않은 요청 대상 매장
 *                       items:
 *                         type: object
 *                         properties:
 *                           shopId:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           averageResponseMinutes:
 *                             type: integer
 *                             description: 해당 매장의 과거 평균 응답 시간. 이력이 없으면 60분
 *                           expectedResponseMinutes:
 *                             type: integer
 *                             description: 예상 응답 시간. 이력이 없으면 60분
 *       400:
 *         description: 잘못된 견적 요청 식별자
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
 *                       example: INVALID_ESTIMATE_RESPONSE
 *                     message:
 *                       type: string
 *                       example: 견적 응답 형식이 올바르지 않아요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       403:
 *         description: 본인의 견적 요청이 아님
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: ESTIMATE_RESPONSE_FORBIDDEN, message: 접근 권한이 없습니다., data: null }, success: null }
 *       404:
 *         description: 견적 응답을 찾을 수 없음
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: ESTIMATE_RESPONSE_NOT_FOUND, message: 견적 응답을 찾을 수 없어요., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             examples:
 *               unauthorized: { value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null } }
 *               tokenExpired: { value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null } }
 *               tokenInvalid: { value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null } }
 */
/**
 * @openapi
 * /api/v1/estimate/sms:
 *   post:
 *     summary: 안드로이드 릴레이 앱에서 전달한 샵 견적 응답 문자 접수
 *     description: |
 *       안드로이드 릴레이 앱이 샵으로부터 SMS를 수신하면 자동으로 이 엔드포인트를 호출한다.
 *       사용자 앱이 직접 호출하는 API가 아니며, 릴레이 앱 설정에서 수신 문자를 이 URL로
 *       전달하도록 세팅해두어야 한다.
 *
 *       [SMS 릴레이 세팅 방법]
 *       1. 안드로이드 릴레이 앱에서 SMS 수신 권한(READ_SMS, RECEIVE_SMS) 획득
 *       2. BroadcastReceiver로 SMS_RECEIVED 인텐트를 감지
 *       3. 수신된 문자를 아래 형식으로 가공해 서버로 POST 요청
 *       4. source: 기기 고유 식별자 (예: 디바이스 UUID), messageId: 문자 고유 ID로 중복 수신 방지
 *
 *       [rawPayload 구성]
 *       - address: 발신자 번호 (샵 전화번호)
 *       - body: SMS 원문 (가격, 시간 등 파싱 대상)
 *       - receivedAt: 수신 시각 (ISO 8601)
 *     tags: [Estimate Response]
 *     parameters:
 *       - in: header
 *         name: x-sms-webhook-key
 *         required: true
 *         schema: { type: string }
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
 *                 required: [address, body, receivedAt]
 *                 additionalProperties: true
 *                 properties:
 *                   address:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 30
 *                     description: SMS 발신 번호
 *                     example: "01012345678"
 *                   body:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 10000
 *                     description: 가격과 예약 가능 시간이 포함된 SMS 원문
 *                     example: "총 55000원, 7월 20일 오후 2시 가능해요."
 *                   receivedAt:
 *                     type: string
 *                     format: date-time
 *                     description: UTC offset을 포함한 SMS 수신 시각
 *                     example: "2026-07-18T13:20:38+09:00"
 *     responses:
 *       202:
 *         description: 견적 응답 문자 접수 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: SUCCESS
 *                 error:
 *                   nullable: true
 *                   example: null
 *                 success:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     source:
 *                       type: string
 *                       example: android-device-a1b2c3
 *                     messageId:
 *                       type: string
 *                       example: android-sms-1042
 *                     direction:
 *                       type: string
 *                       example: INBOUND
 *                     status:
 *                       type: string
 *                       enum: [PENDING, SENT, PARSED, FAILED]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 견적 응답 문자 형식 오류
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
 *                       example: INVALID_ESTIMATE_RESPONSE
 *                     message:
 *                       type: string
 *                       example: 견적 응답 형식이 올바르지 않아요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       401:
 *         description: SMS 웹훅 권한 없음
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: UNAUTHORIZED_SMS_WEBHOOK, message: SMS 웹훅 권한이 없어요., data: null }, success: null }
 */
/**
 * @openapi
 * /api/v1/estimate/{proposal_id}/time:
 *   get:
 *     summary: 샵 견적의 예약 가능 시간 조회
 *     security:
 *       - bearerAuth: []
 *     tags: [Estimate Response]
 *     parameters:
 *       - in: path
 *         name: proposal_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 예약 가능 시간 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: SUCCESS
 *                 error:
 *                   nullable: true
 *                   example: null
 *                 success:
 *                   type: object
 *                   properties:
 *                     estimateResponseId:
 *                       type: integer
 *                       example: 1
 *                     proposalTimes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           proposalDateTime:
 *                             type: string
 *                             format: date-time
 *                           isSelected:
 *                             type: boolean
 *       404:
 *         description: 견적 응답을 찾을 수 없음
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
 *                       example: ESTIMATE_RESPONSE_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: 견적 응답을 찾을 수 없어요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: 잘못된 견적 응답 식별자
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: INVALID_ESTIMATE_RESPONSE, message: 견적 응답 형식이 올바르지 않아요., data: null }, success: null }
 *       403:
 *         description: 본인의 견적 요청이 아님
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: ESTIMATE_RESPONSE_FORBIDDEN, message: 접근 권한이 없습니다., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             examples:
 *               unauthorized: { value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null } }
 *               tokenExpired: { value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null } }
 *               tokenInvalid: { value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null } }
 */
/**
 * @openapi
 * /api/v1/estimate/{proposal_id}/detail:
 *   get:
 *     summary: 샵 견적 상세 조회
 *     security:
 *       - bearerAuth: []
 *     tags: [Estimate Response]
 *     parameters:
 *       - in: path
 *         name: proposal_id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: 샵 견적 상세 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType:
 *                   type: string
 *                   example: SUCCESS
 *                 error:
 *                   nullable: true
 *                   example: null
 *                 success:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     requestId:
 *                       type: integer
 *                     title:
 *                       type: string
 *                       nullable: true
 *                       description: 견적 제목. 예) "8/3 패디 견적"
 *                       example: "8/3 패디 견적"
 *                     shop:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                         name:
 *                           type: string
 *                         phoneNumber:
 *                           type: string
 *                           nullable: true
 *                         address:
 *                           type: string
 *                         addressDetail:
 *                           type: string
 *                           nullable: true
 *                         latitude:
 *                           type: number
 *                         longitude:
 *                           type: number
 *                         rating:
 *                           type: number
 *                         reviewCount:
 *                           type: integer
 *                         businessHours:
 *                           type: object
 *                           nullable: true
 *                           additionalProperties:
 *                             type: string
 *                           description: 요일별 영업시간. 정보가 없으면 null
 *                           example: { MON: "10:00-20:00", TUE: "10:00-20:00" }
 *                         closedDays:
 *                           type: array
 *                           nullable: true
 *                           items:
 *                             type: string
 *                           description: 정기 휴무일. 정보가 없으면 null
 *                           example: [SUN]
 *                     price:
 *                       type: object
 *                       required: [totalPrice]
 *                       description: 시술 가능한 견적의 총액은 필수이며, 시술 불가 응답에서는 totalPrice가 null이다. 상세 금액은 샵이 문자에 명시한 경우에만 제공한다.
 *                       example: { totalPrice: 55000, basePrice: null, removalPrice: null, designExtraPrice: null, optionExtraPrice: null }
 *                       properties:
 *                         totalPrice:
 *                           type: integer
 *                           nullable: true
 *                           example: 55000
 *                         basePrice:
 *                           type: integer
 *                           nullable: true
 *                           description: 샵이 기본 가격을 명시한 경우에만 제공
 *                           example: null
 *                         removalPrice:
 *                           type: integer
 *                           nullable: true
 *                           description: 샵이 제거 금액을 별도로 명시한 경우에만 제공
 *                           example: null
 *                         designExtraPrice:
 *                           type: integer
 *                           nullable: true
 *                           description: 샵이 디자인(아트/그림 등) 관련 추가 금액을 명시한 경우에만 제공
 *                           example: null
 *                         optionExtraPrice:
 *                           type: integer
 *                           nullable: true
 *                           description: 샵이 그 외 옵션(젤/파츠 등) 관련 추가 금액을 명시한 경우에만 제공
 *                           example: null
 *                     memo:
 *                       type: string
 *                       nullable: true
 *                     estimatedDurationMinutes:
 *                       type: integer
 *                       description: 예상 시술 소요 시간. 샵이 명시하지 않으면 60분
 *                       example: 60
 *                     canProvideService:
 *                       type: boolean
 *                       description: 시술 가능 여부
 *                     isRemovalIncluded:
 *                       type: boolean
 *                       description: 샵이 제거비가 총액에 포함됐다고 명시한 경우 true
 *                     status:
 *                       type: string
 *                       enum: [SUBMITTED, ACCEPTED, REJECTED]
 *                     proposalDateTimes:
 *                       type: array
 *                       items:
 *                         type: string
 *                         format: date-time
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: 견적 응답을 찾을 수 없음
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
 *                       example: ESTIMATE_RESPONSE_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: 견적 응답을 찾을 수 없어요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       400:
 *         description: 잘못된 견적 응답 식별자
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: INVALID_ESTIMATE_RESPONSE, message: 견적 응답 형식이 올바르지 않아요., data: null }, success: null }
 *       403:
 *         description: 본인의 견적 요청이 아님
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: ESTIMATE_RESPONSE_FORBIDDEN, message: 접근 권한이 없습니다., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             examples:
 *               unauthorized: { value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null } }
 *               tokenExpired: { value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null } }
 *               tokenInvalid: { value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null } }
 */
const registerRoutes = (router: Router, routeController: EstimateResponseController): Router => {
  router.get('/result/:request_id', authMiddleware, routeController.getList);
  router.post('/sms', smsWebhookAuth, routeController.receive);
  router.get('/:proposal_id/time', authMiddleware, routeController.getProposalTimes);
  router.get('/:proposal_id/detail', authMiddleware, routeController.getDetail);

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
