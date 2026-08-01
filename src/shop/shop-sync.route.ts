import { Router } from 'express';
import { HttpSbizShopClient } from '../external/sbiz/sbiz-shop.client';
import { ShopSyncController } from './controller/shop-sync.controller';
import { shopSyncAuth } from './middlewares/shop-sync-auth.middleware';
import { PrismaShopRepository } from './repository/shop.repository';
import { ShopSyncService } from './service/shop-sync.service';

const shopSyncRouter = Router();

/**
 * @openapi
 * /admin/api/v1/shops/sync:
 *   post:
 *     summary: 소상공인 상가정보 API의 네일샵 동기화
 *     tags: [Admin Shop]
 *     parameters:
 *       - in: header
 *         name: x-admin-sync-key
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [industryCode]
 *             properties:
 *               industryCode: { type: string, description: 상권업종 소분류 코드 }
 *               pageSize: { type: integer, default: 1000, maximum: 1000 }
 *               maxPages: { type: integer, default: 100, maximum: 100 }
 *     responses:
 *       200: { description: 동기화 완료 }
 *       400:
 *         description: 잘못된 동기화 요청
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: INVALID_SHOP_SYNC_REQUEST, message: 네일샵 동기화 요청을 확인해주세요., data: null }, success: null }
 *       401:
 *         description: 동기화 권한 없음
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: UNAUTHORIZED_SHOP_SYNC, message: 네일샵 동기화 권한이 없어요., data: null }, success: null }
 *       502:
 *         description: 소상공인 API 호출 실패
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ApiErrorResponse' }
 *             example: { resultType: FAIL, error: { code: SHOP_DATA_PROVIDER_ERROR, message: 소상공인 상가 정보를 불러오지 못했어요., data: null }, success: null }
 */
const createDefaultController = (): ShopSyncController =>
  new ShopSyncController(new ShopSyncService(new HttpSbizShopClient(), new PrismaShopRepository()));

shopSyncRouter.post('/sync', shopSyncAuth, async (req, res, next) => {
  try {
    await createDefaultController().sync(req, res, next);
  } catch (error) {
    next(error);
  }
});

export default shopSyncRouter;

export const createShopSyncRouter = (service: ShopSyncService): Router => {
  const router = Router();
  const controller = new ShopSyncController(service);
  router.post('/sync', shopSyncAuth, controller.sync);
  return router;
};
