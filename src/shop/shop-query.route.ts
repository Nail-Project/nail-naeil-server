import { Router } from 'express';
import { ShopQueryController } from './controller/shop-query.controller';
import { PrismaShopQueryRepository } from './repository/shop-query.repository';
import { ShopQueryService } from './service/shop-query.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

const repository = new PrismaShopQueryRepository();
const service = new ShopQueryService(repository);
const controller = new ShopQueryController(service);
const shopQueryRouter = Router();

/**
 * @openapi
 * /api/v1/shops:
 *   get:
 *     summary: 샵 목록 조회
 *     security: [{ bearerAuth: [] }]
 *     tags: [Shop]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *       - in: query
 *         name: latitude
 *         description: 거리 계산용 위도. longitude와 함께 전달
 *         schema: { type: number, format: double, minimum: -90, maximum: 90 }
 *       - in: query
 *         name: longitude
 *         description: 거리 계산용 경도. latitude와 함께 전달
 *         schema: { type: number, format: double, minimum: -180, maximum: 180 }
 *     responses:
 *       200:
 *         description: 샵 목록 조회 성공
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
 *                     shops:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ShopSummary'
 *                     nextCursor:
 *                       type: integer
 *                       nullable: true
 *       400:
 *         description: 잘못된 조회 조건
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
 *                       example: INVALID_SHOP_QUERY_REQUEST
 *                     message:
 *                       type: string
 *                       example: 샵 조회 요청을 확인해주세요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       401:
 *         $ref: '#/components/responses/AuthenticationRequiredResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerErrorResponse'
 */
shopQueryRouter.get('/', authMiddleware, controller.getList);

/**
 * @openapi
 * /api/v1/shops/search:
 *   get:
 *     summary: 샵 이름 또는 주소 검색
 *     security: [{ bearerAuth: [] }]
 *     tags: [Shop]
 *     parameters:
 *       - in: query
 *         name: keyword
 *         required: true
 *         schema: { type: string, minLength: 1, maxLength: 100 }
 *       - in: query
 *         name: cursor
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *       - in: query
 *         name: latitude
 *         schema: { type: number, format: double, minimum: -90, maximum: 90 }
 *       - in: query
 *         name: longitude
 *         schema: { type: number, format: double, minimum: -180, maximum: 180 }
 *     responses:
 *       200:
 *         description: 샵 검색 성공
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
 *                     shops:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ShopSummary'
 *                     nextCursor:
 *                       type: integer
 *                       nullable: true
 *       400:
 *         description: 잘못된 검색 조건
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
 *                       example: INVALID_SHOP_QUERY_REQUEST
 *                     message:
 *                       type: string
 *                       example: 샵 조회 요청을 확인해주세요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       401:
 *         $ref: '#/components/responses/AuthenticationRequiredResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerErrorResponse'
 */
shopQueryRouter.get('/search', authMiddleware, controller.search);

/**
 * @openapi
 * /api/v1/shops/{shopId}/reviews:
 *   get:
 *     summary: 매장 리뷰 목록 조회
 *     tags: [Shop]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: cursor
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
 *     responses:
 *       200:
 *         description: 매장 리뷰 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType: { type: string, example: SUCCESS }
 *                 error: { nullable: true, example: null }
 *                 success: { $ref: '#/components/schemas/ShopReviewListResponse' }
 *       400:
 *         $ref: '#/components/responses/InvalidShopQueryResponse'
 *       404:
 *         $ref: '#/components/responses/ShopNotFoundResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerErrorResponse'
 */
shopQueryRouter.get('/:shopId/reviews', controller.getReviews);

/**
 * @openapi
 * /api/v1/shops/{shopId}:
 *   get:
 *     summary: 샵 상세 조회
 *     security: [{ bearerAuth: [] }]
 *     tags: [Shop]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: latitude
 *         schema: { type: number, format: double }
 *       - in: query
 *         name: longitude
 *         schema: { type: number, format: double }
 *     responses:
 *       200:
 *         description: 샵 상세 조회 성공
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
 *                     shopId:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                     address:
 *                       type: string
 *                     addressDetail:
 *                       type: string
 *                       nullable: true
 *                     districtName:
 *                       type: string
 *                       nullable: true
 *                     adminDongName:
 *                       type: string
 *                       nullable: true
 *                     latitude:
 *                       type: number
 *                     longitude:
 *                       type: number
 *                     phoneNumber:
 *                       type: string
 *                       nullable: true
 *                     provinceName:
 *                       type: string
 *                       nullable: true
 *                     locationGuide:
 *                       type: string
 *                       nullable: true
 *                     parkingInfo:
 *                       type: string
 *                       nullable: true
 *                     thumbnailImageUrl:
 *                       type: string
 *                       nullable: true
 *                     businessHours:
 *                       nullable: true
 *                     closedDays:
 *                       nullable: true
 *                     rating:
 *                       type: number
 *                     reviewCount:
 *                       type: integer
 *                     distanceMeters:
 *                       type: integer
 *                       nullable: true
 *                     isWished:
 *                       type: boolean
 *       400:
 *         description: 잘못된 샵 ID
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
 *                       example: INVALID_SHOP_QUERY_REQUEST
 *                     message:
 *                       type: string
 *                       example: 샵 조회 요청을 확인해주세요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 *       401:
 *         $ref: '#/components/responses/AuthenticationRequiredResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerErrorResponse'
 *       404:
 *         description: 샵을 찾을 수 없음
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
 *                       example: SHOP_NOT_FOUND
 *                     message:
 *                       type: string
 *                       example: 샵을 찾을 수 없습니다.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 */
shopQueryRouter.get('/:shopId', authMiddleware, controller.getDetail);

export default shopQueryRouter;
