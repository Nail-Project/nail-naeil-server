import { Router } from 'express';
import { ReviewController } from './controller/review.controller';
import { PrismaReviewRepository } from './repository/review.repository';
import { ReviewService } from './service/review.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

const repository = new PrismaReviewRepository();
const service = new ReviewService(repository);
const controller = new ReviewController(service);
const reviewRouter = Router();
const shopReviewsRouter = Router();

/**
 * @openapi
 * /api/v1/reviews:
 *   post:
 *     summary: 리뷰 작성
 *     description: >
 *       시술이 완료된(COMPLETED) 본인 예약에만 리뷰를 작성할 수 있다. 예약 1건당 리뷰는 1개까지만
 *       작성 가능하다. 리뷰 등록 시 해당 샵의 평점(rating)/리뷰 수(reviewCount)가 함께 재계산된다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Review
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reservationId
 *               - rating
 *               - content
 *             properties:
 *               reservationId:
 *                 type: integer
 *                 example: 1
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
 *         description: 유효하지 않은 reservationId 또는 별점/내용 값
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: REVIEW_VALIDATION_FAILED, message: 별점과 리뷰 내용을 확인해주세요., data: null }, success: null }
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

/**
 * @openapi
 * /api/v1/reviews/{reviewId}:
 *   patch:
 *     summary: 리뷰 수정
 *     description: 본인이 작성한 리뷰만 수정할 수 있다. rating/content 중 하나 이상을 전달한다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Review
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 4
 *               content:
 *                 type: string
 *                 example: 다시 생각해보니 조금 아쉬운 점도 있었어요.
 *     responses:
 *       200:
 *         description: 리뷰 수정 성공
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
 *                       example: 4
 *                     content:
 *                       type: string
 *                       example: 다시 생각해보니 조금 아쉬운 점도 있었어요.
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 유효하지 않은 reviewId 또는 별점/내용 값
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             examples:
 *               invalidId:
 *                 value: { resultType: FAIL, error: { code: INVALID_REVIEW_REQUEST, message: 요청 값을 확인해주세요., data: null }, success: null }
 *               invalidBody:
 *                 value: { resultType: FAIL, error: { code: REVIEW_VALIDATION_FAILED, message: 별점과 리뷰 내용을 확인해주세요., data: null }, success: null }
 *       404:
 *         description: 존재하지 않거나 본인이 작성한 리뷰가 아님
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: REVIEW_NOT_FOUND, message: 존재하지 않는 리뷰입니다., data: null }, success: null }
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
 *   delete:
 *     summary: 리뷰 삭제
 *     description: 본인이 작성한 리뷰만 삭제할 수 있다. 삭제 시 해당 샵의 평점/리뷰 수가 함께 재계산된다.
 *     security:
 *       - bearerAuth: []
 *     tags:
 *       - Review
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 리뷰 삭제 성공
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
 *       400:
 *         description: 유효하지 않은 reviewId
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: INVALID_REVIEW_REQUEST, message: 요청 값을 확인해주세요., data: null }, success: null }
 *       404:
 *         description: 존재하지 않거나 본인이 작성한 리뷰가 아님
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: REVIEW_NOT_FOUND, message: 존재하지 않는 리뷰입니다., data: null }, success: null }
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
 * /api/v1/shops/{shopId}/reviews:
 *   get:
 *     summary: 샵 리뷰 목록 조회
 *     description: 특정 샵에 달린 리뷰 목록을 작성일 최신순으로 조회한다. 인증이 필요 없는 공개 API다.
 *     tags:
 *       - Review
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: size
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *     responses:
 *       200:
 *         description: 샵 리뷰 목록 조회 성공
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
 *                     reviews:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           reviewId:
 *                             type: integer
 *                             example: 1
 *                           userId:
 *                             type: integer
 *                             example: 10
 *                           nickname:
 *                             type: string
 *                             nullable: true
 *                             example: 네일러버
 *                           rating:
 *                             type: integer
 *                             example: 5
 *                           content:
 *                             type: string
 *                             example: 시술이 꼼꼼하고 만족스러웠어요!
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                     pageInfo:
 *                       type: object
 *                       properties:
 *                         nextCursor:
 *                           type: string
 *                           nullable: true
 *                         hasNext:
 *                           type: boolean
 *       400:
 *         description: 유효하지 않은 shopId 또는 cursor/size 값
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: INVALID_REVIEW_REQUEST, message: 요청 값을 확인해주세요., data: null }, success: null }
 *       404:
 *         description: 존재하지 않는 샵
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiErrorResponse'
 *             example: { resultType: FAIL, error: { code: REVIEW_SHOP_NOT_FOUND, message: 존재하지 않는 샵입니다., data: null }, success: null }
 */
const registerReviewRoutes = (router: Router, routeController: ReviewController): Router => {
  router.post('/', authMiddleware, routeController.createReview);
  router.patch('/:reviewId', authMiddleware, routeController.updateReview);
  router.delete('/:reviewId', authMiddleware, routeController.deleteReview);

  return router;
};

const registerShopReviewRoutes = (router: Router, routeController: ReviewController): Router => {
  router.get('/:shopId/reviews', routeController.getShopReviews);

  return router;
};

registerReviewRoutes(reviewRouter, controller);
registerShopReviewRoutes(shopReviewsRouter, controller);

export default reviewRouter;
export { shopReviewsRouter };

export const createReviewRouter = (reviewService: ReviewService): Router => {
  const injectedController = new ReviewController(reviewService);

  return registerReviewRoutes(Router(), injectedController);
};

export const createShopReviewsRouter = (reviewService: ReviewService): Router => {
  const injectedController = new ReviewController(reviewService);

  return registerShopReviewRoutes(Router(), injectedController);
};
