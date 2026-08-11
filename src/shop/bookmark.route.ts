import { Router } from 'express';
import { ShopQueryController } from './controller/shop-query.controller';
import { PrismaShopQueryRepository } from './repository/shop-query.repository';
import { ShopQueryService } from './service/shop-query.service';
import { authMiddleware } from '../common/middlewares/auth.middleware';

const repository = new PrismaShopQueryRepository();
const service = new ShopQueryService(repository);
const controller = new ShopQueryController(service);

// GET /api/v1/users/me/bookmark - 찜한 매장 목록 조회
export const bookmarkListRouter = Router();

/**
 * @openapi
 * /api/v1/users/me/bookmark:
 *   get:
 *     summary: 찜한 매장 목록 조회
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
 *         schema: { type: number, format: double }
 *       - in: query
 *         name: longitude
 *         schema: { type: number, format: double }
 *     responses:
 *       200:
 *         description: 찜한 매장 목록 조회 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType: { type: string, example: SUCCESS }
 *                 error: { nullable: true, example: null }
 *                 success: { $ref: '#/components/schemas/ShopListSuccess' }
 *       400:
 *         $ref: '#/components/responses/InvalidShopQueryResponse'
 *       401:
 *         $ref: '#/components/responses/AuthenticationRequiredResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerErrorResponse'
 */
bookmarkListRouter.get('/', authMiddleware, controller.getWishlist);

// POST /api/v1/bookmark/toggle - 매장 찜 추가/해제 토글
export const bookmarkToggleRouter = Router();

/**
 * @openapi
 * /api/v1/bookmark/toggle:
 *   post:
 *     summary: 매장 찜 토글(추가/해제)
 *     security: [{ bearerAuth: [] }]
 *     tags: [Shop]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shopId]
 *             properties:
 *               shopId: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: 매장 찜 토글 성공 - 토글 후 상태(isWished)를 반환한다.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resultType: { type: string, example: SUCCESS }
 *                 error: { nullable: true, example: null }
 *                 success: { $ref: '#/components/schemas/ShopWishResponse' }
 *       400:
 *         $ref: '#/components/responses/InvalidShopQueryResponse'
 *       401:
 *         $ref: '#/components/responses/AuthenticationRequiredResponse'
 *       404:
 *         $ref: '#/components/responses/ShopNotFoundResponse'
 *       500:
 *         $ref: '#/components/responses/InternalServerErrorResponse'
 */
bookmarkToggleRouter.post('/toggle', authMiddleware, controller.toggleWish);
