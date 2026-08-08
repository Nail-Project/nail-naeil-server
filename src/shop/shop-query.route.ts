import { Router } from 'express';
import { ShopQueryController } from './controller/shop-query.controller';
import { PrismaShopQueryRepository } from './repository/shop-query.repository';
import { ShopQueryService } from './service/shop-query.service';

const repository = new PrismaShopQueryRepository();
const service = new ShopQueryService(repository);
const controller = new ShopQueryController(service);
const shopQueryRouter = Router();

/**
 * @openapi
 * /api/v1/shops:
 *   get:
 *     summary: 샵 목록 조회
 *     tags: [Shop]
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 50 }
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
 *                         type: object
 *                         properties:
 *                           shopId:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                             example: 네일샵이름
 *                           address:
 *                             type: string
 *                           addressDetail:
 *                             type: string
 *                             nullable: true
 *                           districtName:
 *                             type: string
 *                             nullable: true
 *                           adminDongName:
 *                             type: string
 *                             nullable: true
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
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
 */
shopQueryRouter.get('/', controller.getList);

/**
 * @openapi
 * /api/v1/shops/search:
 *   get:
 *     summary: 샵 이름 또는 주소 검색
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
 *                         type: object
 *                         properties:
 *                           shopId:
 *                             type: integer
 *                             example: 1
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                           addressDetail:
 *                             type: string
 *                             nullable: true
 *                           districtName:
 *                             type: string
 *                             nullable: true
 *                           adminDongName:
 *                             type: string
 *                             nullable: true
 *                           latitude:
 *                             type: number
 *                           longitude:
 *                             type: number
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
 */
shopQueryRouter.get('/search', controller.search);

/**
 * @openapi
 * /api/v1/shops/{shopId}:
 *   get:
 *     summary: 샵 상세 조회
 *     tags: [Shop]
 *     parameters:
 *       - in: path
 *         name: shopId
 *         required: true
 *         schema: { type: integer }
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
shopQueryRouter.get('/:shopId', controller.getDetail);

export default shopQueryRouter;
