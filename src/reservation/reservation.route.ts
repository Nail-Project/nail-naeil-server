import { Router } from 'express';
import { ReservationController } from './controller/reservation.controller';

const reservationController = new ReservationController();
const router = Router();

/**
 * @openapi
 * /api/v1/reserve:
 *   post:
 *     summary: 예약 생성
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
 *               - proposalTimeId
 *             properties:
 *               proposalId:
 *                 type: integer
 *                 example: 5
 *               proposalTimeId:
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
router.post('/', reservationController.createReservation);

/**
 * @openapi
 * /api/v1/reserve/detail:
 *   get:
 *     summary: 예약 목록 조회
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
router.get('/detail', reservationController.getReservations);

/**
 * @openapi
 * /api/v1/reserve/{reservationId}:
 *   get:
 *     summary: 예약 상세 조회
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
router.get('/:reservationId', reservationController.getReservationDetail);

export default router;
