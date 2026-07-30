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
 *                 example: 5
 *               timeId:
 *                 type: integer
 *                 example: 12
 *     responses:
 *       201:
 *         description: 예약 생성 성공
 *       400:
 *         description: 요청 값 유효성 검사 실패
 *       404:
 *         description: 존재하지 않는 견적 또는 예약 시간
 *       409:
 *         description: 이미 예약된 견적
 *       500:
 *         description: 서버 오류
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
 *         name: page
 *         schema:
 *           type: integer
 *           default: 0
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
 *       500:
 *         description: 서버 오류
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
 *       404:
 *         description: 존재하지 않는 예약
 *       500:
 *         description: 서버 오류
 */
const registerRoutes = (router: Router, routeController: ReservationController): Router => {
  router.post('/', authMiddleware, routeController.createReservation);
  router.get('/detail', authMiddleware, routeController.getReservations);
  router.get('/:reservationId', authMiddleware, routeController.getReservationDetail);

  return router;
};

registerRoutes(reservationRouter, controller);

export default reservationRouter;

export const createReservationRouter = (reservationService: ReservationService): Router => {
  const injectedController = new ReservationController(reservationService);

  return registerRoutes(Router(), injectedController);
};
