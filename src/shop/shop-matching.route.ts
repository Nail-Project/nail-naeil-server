import { Router } from 'express';
import { ShopMatchingController } from './controller/shop-matching.controller';
import { PrismaShopMatchingRepository } from './repository/shop-matching.repository';
import { ShopMatchingService } from './service/shop-matching.service';

const repository = new PrismaShopMatchingRepository();
const service = new ShopMatchingService(repository);
const controller = new ShopMatchingController(service);
const shopMatchingRouter = Router();

/**
 * @openapi
 * /api/v1/shops/matches:
 *   get:
 *     summary: 탐색 범위에 맞는 주변 샵 조회
 *     tags:
 *       - Shop
 *     parameters:
 *       - in: query
 *         name: latitude
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *       - in: query
 *         name: longitude
 *         required: true
 *         schema:
 *           type: number
 *           format: double
 *       - in: query
 *         name: recommendType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [CLOSE, BALANCED, WIDE, CHEAP]
 *     responses:
 *       200:
 *         description: 주변 샵 조회 성공
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
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       shopId:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                         nullable: true
 *                       address:
 *                         type: string
 *                       addressDetail:
 *                         type: string
 *                         nullable: true
 *                       latitude:
 *                         type: number
 *                       longitude:
 *                         type: number
 *                       distanceMeters:
 *                         type: number
 *                         example: 350.5
 *       400:
 *         description: 잘못된 좌표 또는 지원하지 않는 탐색 방식
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
 *                       example: INVALID_SHOP_LOCATION
 *                     message:
 *                       type: string
 *                       example: 샵을 탐색할 위치를 확인해주세요.
 *                     data:
 *                       nullable: true
 *                 success:
 *                   nullable: true
 *                   example: null
 */
shopMatchingRouter.get('/matches', controller.match);

export default shopMatchingRouter;
