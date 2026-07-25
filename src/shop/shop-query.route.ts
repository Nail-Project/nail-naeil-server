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
 *       200: { description: 샵 목록 조회 성공 }
 *       400: { description: 잘못된 조회 조건 }
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
 *       200: { description: 샵 검색 성공 }
 *       400: { description: 잘못된 검색 조건 }
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
 *       200: { description: 샵 상세 조회 성공 }
 *       400: { description: 잘못된 샵 ID }
 *       404: { description: 샵을 찾을 수 없음 }
 */
shopQueryRouter.get('/:shopId', controller.getDetail);

export default shopQueryRouter;
