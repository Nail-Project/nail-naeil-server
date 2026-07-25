import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { ShopMatchingController } from '../../src/shop/controller/shop-matching.controller';
import type { MatchedShopResponse } from '../../src/shop/dto/response/matched-shop-response';
import type { ShopMatchingService } from '../../src/shop/service/shop-matching.service';

const matchedShop: MatchedShopResponse = {
  shopId: 1,
  name: '내일네일',
  phoneNumber: '01012345678',
  address: '서울특별시 동작구 상도로 1',
  addressDetail: null,
  latitude: 37.499,
  longitude: 126.953,
  distanceMeters: 350,
};

const createApp = () => {
  const service = {
    match: vi.fn().mockResolvedValue([matchedShop]),
  };
  const controller = new ShopMatchingController(service as unknown as ShopMatchingService);
  const app = express();

  app.get('/api/v1/shops/matches', controller.match);
  app.use(errorHandler);

  return { app, service };
};

describe('shop matching route', () => {
  it('좌표와 탐색 타입을 전달해 주변 샵을 조회한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get(
      '/api/v1/shops/matches?latitude=37.499&longitude=126.953&recommendType=CLOSE',
    );

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      resultType: 'SUCCESS',
      success: [{ shopId: 1, distanceMeters: 350 }],
    });
    expect(service.match).toHaveBeenCalledWith({
      latitude: 37.499,
      longitude: 126.953,
      recommendType: 'CLOSE',
    });
  });

  it('필수 쿼리가 빠지면 공통 400 에러로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get(
      '/api/v1/shops/matches?latitude=37.499&recommendType=CLOSE',
    );

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      resultType: 'FAIL',
      error: { code: 'INVALID_SHOP_MATCH_REQUEST' },
    });
    expect(service.match).not.toHaveBeenCalled();
  });

  it.each([
    'latitude=&longitude=126.953',
    'latitude=%20%20&longitude=126.953',
    'latitude=37.499&longitude=',
    'latitude=37.499&longitude=%20%20',
  ])('빈 좌표 쿼리를 0으로 변환하지 않고 400으로 거절한다: %s', async (query) => {
    const { app, service } = createApp();

    const response = await request(app).get(`/api/v1/shops/matches?${query}&recommendType=CLOSE`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      resultType: 'FAIL',
      error: { code: 'INVALID_SHOP_MATCH_REQUEST' },
    });
    expect(service.match).not.toHaveBeenCalled();
  });
});
