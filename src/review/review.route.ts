import { Router } from 'express';
import { ReviewController } from './controller/review.controller';
import { PrismaReviewRepository } from './repository/review.repository';
import { ReviewService } from './service/review.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

const repository = new PrismaReviewRepository();
const service = new ReviewService(repository);
const controller = new ReviewController(service);
const reviewRouter = Router();

/**
 * @openapi
 * /api/v1/reserve/{reservationId}/review:
 *   post:
 *     summary: 리뷰 작성
 *     description: >
 *       시술이 완료된(COMPLETED) 본인 예약에만 리뷰를 작성할 수 있다. 예약 1건당 리뷰는 1개까지만
 *       작성 가능하다. 리뷰 등록 시 해당 샵의 평점(rating)/리뷰 수(reviewCount)가 함께 재계산된다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Review
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
 *               - rating
 *               - content
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               content:
 *                 type: string
 *                 example: 시술이 꼼꼼하고 만족스러웠어요!
 *     responses:
 *       201:
 *         description: 리뷰 작성 성공
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
 *                     reviewId:
 *                       type: integer
 *                       example: 1
 *                     reservationId:
 *                       type: integer
 *                       example: 1
 *                     shopId:
 *                       type: integer
 *                       example: 5
 *                     rating:
 *                       type: integer
 *                       example: 5
 *                     content:
 *                       type: string
 *                       example: 시술이 꼼꼼하고 만족스러웠어요!
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 유효하지 않은 예약 id 또는 별점/내용 값
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               invalidId:
 *                 value: { resultType: FAIL, error: { code: INVALID_REVIEW_RESERVATION_ID, message: 유효하지 않은 예약 id입니다., data: null }, success: null }
 *               invalidBody:
 *                 value: { resultType: FAIL, error: { code: REVIEW_VALIDATION_FAILED, message: 별점과 리뷰 내용을 확인해주세요., data: null }, success: null }
 *       404:
 *         description: 존재하지 않거나 본인 소유가 아닌 예약
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: REVIEW_RESERVATION_NOT_FOUND, message: 존재하지 않는 예약입니다., data: null }, success: null }
 *       409:
 *         description: 완료되지 않은 예약이거나 이미 리뷰를 작성한 예약
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               notCompleted:
 *                 value: { resultType: FAIL, error: { code: REVIEW_NOT_ALLOWED, message: 시술이 완료된 예약만 리뷰를 작성할 수 있습니다., data: null }, success: null }
 *               alreadyExists:
 *                 value: { resultType: FAIL, error: { code: REVIEW_ALREADY_EXISTS, message: 이미 리뷰를 작성한 예약입니다., data: null }, success: null }
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
const registerRoutes = (router: Router, routeController: ReviewController): Router => {
  router.post('/:reservationId/review', authMiddleware, routeController.createReview);

  return router;
};

registerRoutes(reviewRouter, controller);

export default reviewRouter;

export const createReviewRouter = (reviewService: ReviewService): Router => {
  const injectedController = new ReviewController(reviewService);

  return registerRoutes(Router(), injectedController);
};
