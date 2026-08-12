import express from 'express';
import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createShopAdminRouter } from '../../src/shop/shop-admin.route';
import type { ShopAdminService } from '../../src/shop/service/shop-admin.service';

const ADMIN_KEY = 'test-shop-admin-key';
const shop = { shopId: 1, name: '네일내일', isDataActive: true };
const validPayload = {
  name: '네일내일',
  address: '서울시 강남구',
  latitude: 37.5,
  longitude: 127,
};

beforeAll(() => {
  process.env.SHOP_SYNC_ADMIN_KEY = ADMIN_KEY;
});

const createApp = () => {
  const service = {
    getShops: vi.fn().mockResolvedValue({ shops: [shop], nextCursor: null, hasNext: false }),
    getShop: vi.fn().mockResolvedValue(shop),
    createShop: vi.fn().mockResolvedValue(shop),
    updateShop: vi.fn().mockResolvedValue(shop),
    deactivateShop: vi.fn().mockResolvedValue({ ...shop, isDataActive: false }),
  };
  const app = express();
  app.use(express.json());
  app.use('/admin/api/v1/shops', createShopAdminRouter(service as unknown as ShopAdminService));
  app.use(errorHandler);
  return { app, service };
};

describe('Shop Admin API', () => {
  it('관리자 키 없이는 목록을 조회할 수 없다', async () => {
    const { app } = createApp();
    const response = await request(app).get('/admin/api/v1/shops');
    expect(response.status).toBe(401);
  });

  it('목록 쿼리를 파싱해 서비스로 전달한다', async () => {
    const { app, service } = createApp();
    const response = await request(app)
      .get('/admin/api/v1/shops?cursor=10&limit=5&active=false')
      .set('x-admin-sync-key', ADMIN_KEY);
    expect(response.status).toBe(200);
    expect(service.getShops).toHaveBeenCalledWith({ cursor: 10, limit: 5, active: 'false' });
  });

  it('샵을 생성한다', async () => {
    const { app, service } = createApp();
    const response = await request(app)
      .post('/admin/api/v1/shops')
      .set('x-admin-sync-key', ADMIN_KEY)
      .send(validPayload);
    expect(response.status).toBe(201);
    expect(service.createShop).toHaveBeenCalledWith(validPayload);
  });

  it('필수값이 빠진 생성 요청은 거절한다', async () => {
    const { app, service } = createApp();
    const response = await request(app)
      .post('/admin/api/v1/shops')
      .set('x-admin-sync-key', ADMIN_KEY)
      .send({ name: '네일내일' });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_SHOP_ADMIN_REQUEST');
    expect(service.createShop).not.toHaveBeenCalled();
  });

  it('샵을 부분 수정한다', async () => {
    const { app, service } = createApp();
    const response = await request(app)
      .patch('/admin/api/v1/shops/1')
      .set('x-admin-sync-key', ADMIN_KEY)
      .send({ name: '수정 네일' });
    expect(response.status).toBe(200);
    expect(service.updateShop).toHaveBeenCalledWith(1, { name: '수정 네일' });
  });

  it('DELETE는 샵 비활성화 서비스를 호출한다', async () => {
    const { app, service } = createApp();
    const response = await request(app)
      .delete('/admin/api/v1/shops/1')
      .set('x-admin-sync-key', ADMIN_KEY);
    expect(response.status).toBe(200);
    expect(response.body.success.isDataActive).toBe(false);
    expect(service.deactivateShop).toHaveBeenCalledWith(1);
  });
});
