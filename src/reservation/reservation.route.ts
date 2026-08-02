import { Router } from 'express';
import { ReservationController } from './controller/reservation.controller';
import { PrismaReservationRepository } from './repository/reservation.repository';
import { ReservationService } from './service/reservation.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

// TODO: [malibu] Notion API 스펙 문서의 예약 섹션이 실제 응답 형식과 다름
// (isSuccess/code(숫자)/data → resultType/error/success 등, B6/A3/B7 관련).
// 코드 변경 아님 — Notion 문서만 수정하면 됨. 완성된 교체 텍스트는 메모리
// project_reservation_notion_envelope_update.md 참고("응답 통일").
const repository = new PrismaReservationRepository();
const service = new ReservationService(repository);
const controller = new ReservationController(service);
const reservationRouter = Router();

/**
 * @openapi
 * /api/v1/reserve:
 *   post:
 *     summary: 예약 생성
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Reservation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposalId
 *               - timeId
 *             properties:
 *               proposalId:
 *                 type: integer
 *                 description: 샵이 이 견적 요청에 대해 보낸 견적 응답(제안)의 id. 이 견적을 받아들이고 예약하겠다는 뜻으로 넘긴다.
 *                 example: 5
 *               timeId:
 *                 type: integer
 *                 description: 해당 견적 응답에 딸린 예약 가능 시간 슬롯의 id. 샵이 견적과 함께 제시한 여러 시간대 중 사용자가 고른 하나.
 *                 example: 12
 *     responses:
 *       201:
 *         description: 예약 생성 성공
 *       400:
 *         description: 요청 값 유효성 검사 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: RESERVATION_VALIDATION_FAILED, message: 예약 요청 정보를 모두 입력해주세요., data: null }, success: null }
 *       404:
 *         description: 존재하지 않는 견적 또는 예약 시간
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               proposalNotFound:
 *                 value: { resultType: FAIL, error: { code: PROPOSAL_NOT_FOUND, message: 해당 견적 또는 예약 시간을 찾을 수 없습니다., data: null }, success: null }
 *               proposalTimeNotFound:
 *                 value: { resultType: FAIL, error: { code: PROPOSAL_TIME_NOT_FOUND, message: 해당 견적 또는 예약 시간을 찾을 수 없습니다., data: null }, success: null }
 *       409:
 *         description: 이미 예약된 견적
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: ALREADY_RESERVED, message: 이미 예약된 시간입니다., data: null }, success: null }
 *       500:
 *         description: 서버 오류
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: RESERVATION_FAILED, message: 예약을 완료하지 못했어요. 다시 시도해주세요., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null }
 *               tokenExpired:
 *                 value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null }
 *               tokenInvalid:
 *                 value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null }
 */
/**
 * @openapi
 * /api/v1/reserve/detail:
 *   get:
 *     summary: 예약 목록 조회
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Reservation
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CONFIRMED, PAST]
 *         description: CONFIRMED(확정 예약) 또는 PAST(지난 예약 - 완료/취소)
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *         description: 이전 응답의 pageInfo.nextCursor 값. 첫 페이지는 생략한다.
 *       - in: query
 *         name: size
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: 예약 목록 조회 성공
 *       400:
 *         description: 유효하지 않은 쿼리 값
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: INVALID_RESERVATION_REQUEST, message: 유효하지 않은 요청입니다., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null }
 *               tokenExpired:
 *                 value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null }
 *               tokenInvalid:
 *                 value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null }
 */
/**
 * @openapi
 * /api/v1/reserve/{reservationId}:
 *   get:
 *     summary: 예약 상세 조회
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Reservation
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 예약 상세 조회 성공
 *       400:
 *         description: 유효하지 않은 예약 id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: INVALID_RESERVATION_ID, message: 유효하지 않은 예약 id입니다., data: null }, success: null }
 *       404:
 *         description: 존재하지 않는 예약
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: RESERVATION_NOT_FOUND, message: 존재하지 않는 예약입니다., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null }
 *               tokenExpired:
 *                 value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null }
 *               tokenInvalid:
 *                 value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null }
 */
/**
 * @openapi
 * /api/v1/reserve/{reservationId}:
 *   delete:
 *     summary: 예약 취소
 *     description: >
 *       본인 예약만 취소할 수 있다. "예약 변경"은 별도 API 없이 프론트에서 샵 연락처 안내 팝업으로 처리한다(Figma 기준).
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Reservation
 *     parameters:
 *       - in: path
 *         name: reservationId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reason
 *             properties:
 *               reason:
 *                 type: string
 *                 example: 개인 사정으로 인해 취소할게요
 *     responses:
 *       200:
 *         description: 예약 취소 성공
 *       400:
 *         description: 유효하지 않은 예약 id 또는 취소 사유
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               invalidId:
 *                 value: { resultType: FAIL, error: { code: INVALID_RESERVATION_ID, message: 유효하지 않은 예약 id입니다., data: null }, success: null }
 *               invalidReason:
 *                 value: { resultType: FAIL, error: { code: RESERVATION_CANCEL_VALIDATION_FAILED, message: 취소 사유를 입력해주세요., data: null }, success: null }
 *       404:
 *         description: 존재하지 않거나 본인 소유가 아닌 예약
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: RESERVATION_NOT_FOUND, message: 존재하지 않는 예약입니다., data: null }, success: null }
 *       409:
 *         description: 이미 취소되었거나 완료된 예약
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: RESERVATION_ALREADY_FINALIZED, message: 이미 취소되었거나 완료된 예약은 취소할 수 없습니다., data: null }, success: null }
 *       401:
 *         description: 인증 실패
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               unauthorized:
 *                 value: { resultType: FAIL, error: { code: UNAUTHORIZED, message: 로그인이 필요합니다., data: null }, success: null }
 *               tokenExpired:
 *                 value: { resultType: FAIL, error: { code: TOKEN_EXPIRED, message: 토큰이 만료됐습니다., data: null }, success: null }
 *               tokenInvalid:
 *                 value: { resultType: FAIL, error: { code: TOKEN_INVALID, message: 유효하지 않은 토큰입니다., data: null }, success: null }
 */
const registerRoutes = (router: Router, routeController: ReservationController): Router => {
  router.post('/', authMiddleware, routeController.createReservation);
  router.get('/detail', authMiddleware, routeController.getReservations);
  router.get('/:reservationId', authMiddleware, routeController.getReservationDetail);
  router.delete('/:reservationId', authMiddleware, routeController.cancelReservation);

  return router;
};

registerRoutes(reservationRouter, controller);

export default reservationRouter;

export const createReservationRouter = (reservationService: ReservationService): Router => {
  const injectedController = new ReservationController(reservationService);

  return registerRoutes(Router(), injectedController);
};
