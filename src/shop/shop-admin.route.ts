import { Router } from 'express';
import { ShopAdminController } from './controller/shop-admin.controller';
import { shopSyncAuth } from './middlewares/shop-sync-auth.middleware';
import { PrismaShopAdminRepository } from './repository/shop-admin.repository';
import { ShopAdminService } from './service/shop-admin.service';

const shopAdminRouter = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     ShopAdminInput:
 *       type: object
 *       required: [name, address, latitude, longitude]
 *       properties:
 *         name: { type: string, maxLength: 100 }
 *         phoneNumber: { type: string, nullable: true, maxLength: 20 }
 *         address: { type: string, maxLength: 255 }
 *         addressDetail: { type: string, nullable: true, maxLength: 255 }
 *         provinceCode: { type: string, nullable: true, maxLength: 10 }
 *         provinceName: { type: string, nullable: true, maxLength: 50 }
 *         districtCode: { type: string, nullable: true, maxLength: 10 }
 *         districtName: { type: string, nullable: true, maxLength: 50 }
 *         adminDongCode: { type: string, nullable: true, maxLength: 20 }
 *         adminDongName: { type: string, nullable: true, maxLength: 50 }
 *         latitude: { type: number, minimum: -90, maximum: 90 }
 *         longitude: { type: number, minimum: -180, maximum: 180 }
 *         locationGuide: { type: string, nullable: true, maxLength: 255 }
 *         parkingInfo: { type: string, nullable: true, maxLength: 255 }
 *         thumbnailImageUrl: { type: string, nullable: true, maxLength: 500 }
 *         businessHours: { type: object, nullable: true, additionalProperties: true }
 *         closedDays: { type: array, nullable: true, items: { type: string } }
 *     ShopAdmin:
 *       allOf:
 *         - $ref: '#/components/schemas/ShopAdminInput'
 *         - type: object
 *           properties:
 *             shopId: { type: integer }
 *             dataSource: { type: string, nullable: true }
 *             externalStoreId: { type: string, nullable: true }
 *             rating: { type: number }
 *             reviewCount: { type: integer }
 *             isDataActive: { type: boolean }
 *             lastSyncedAt: { type: string, format: date-time, nullable: true }
 *             createdAt: { type: string, format: date-time }
 *             updatedAt: { type: string, format: date-time }
 */

/**
 * @openapi
 * /admin/api/v1/shops:
 *   get:
 *     summary: 관리자 샵 목록 조회
 *     tags: [Admin Shop]
 *     parameters:
 *       - { in: header, name: x-admin-sync-key, required: true, schema: { type: string } }
 *       - { in: query, name: cursor, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: active, schema: { type: string, enum: ["true", "false", all], default: all } }
 *     responses:
 *       200: { description: 샵 목록 조회 성공 }
 *       400: { description: 잘못된 관리자 요청 }
 *       401: { description: 관리자 인증 실패 }
 *   post:
 *     summary: 관리자 샵 생성
 *     tags: [Admin Shop]
 *     parameters:
 *       - { in: header, name: x-admin-sync-key, required: true, schema: { type: string } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ShopAdminInput' }
 *     responses:
 *       201: { description: 샵 생성 성공 }
 *       400: { description: 잘못된 관리자 요청 }
 *       401: { description: 관리자 인증 실패 }
 * /admin/api/v1/shops/{shopId}:
 *   get:
 *     summary: 관리자 샵 상세 조회
 *     tags: [Admin Shop]
 *     parameters:
 *       - { in: header, name: x-admin-sync-key, required: true, schema: { type: string } }
 *       - { in: path, name: shopId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: 샵 상세 조회 성공 }
 *       400: { description: 잘못된 샵 ID }
 *       401: { description: 관리자 인증 실패 }
 *       404: { description: 샵을 찾을 수 없음 }
 *   patch:
 *     summary: 관리자 샵 수정
 *     tags: [Admin Shop]
 *     parameters:
 *       - { in: header, name: x-admin-sync-key, required: true, schema: { type: string } }
 *       - { in: path, name: shopId, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/ShopAdminInput' }
 *     responses:
 *       200: { description: 샵 수정 성공 }
 *       400: { description: 잘못된 관리자 요청 }
 *       401: { description: 관리자 인증 실패 }
 *       404: { description: 샵을 찾을 수 없음 }
 *   delete:
 *     summary: 관리자 샵 비활성화
 *     description: 레코드를 삭제하지 않고 isDataActive를 false로 변경한다.
 *     tags: [Admin Shop]
 *     parameters:
 *       - { in: header, name: x-admin-sync-key, required: true, schema: { type: string } }
 *       - { in: path, name: shopId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: 샵 비활성화 성공 }
 *       400: { description: 잘못된 샵 ID }
 *       401: { description: 관리자 인증 실패 }
 *       404: { description: 샵을 찾을 수 없음 }
 */
const registerRoutes = (router: Router, controller: ShopAdminController): Router => {
  router.get('/', shopSyncAuth, controller.getShops);
  router.post('/', shopSyncAuth, controller.createShop);
  router.get('/:shopId', shopSyncAuth, controller.getShop);
  router.patch('/:shopId', shopSyncAuth, controller.updateShop);
  router.delete('/:shopId', shopSyncAuth, controller.deactivateShop);
  return router;
};

registerRoutes(
  shopAdminRouter,
  new ShopAdminController(new ShopAdminService(new PrismaShopAdminRepository())),
);

export const createShopAdminRouter = (service: ShopAdminService): Router =>
  registerRoutes(Router(), new ShopAdminController(service));

export default shopAdminRouter;
