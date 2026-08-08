import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { ShopQueryController } from '../../src/shop/controller/shop-query.controller';
import type { ShopQueryService } from '../../src/shop/service/shop-query.service';

const createApp = () => {
  const service = {
    getList: vi.fn().mockResolvedValue({ shops: [], nextCursor: null }),
    search: vi.fn().mockResolvedValue({ shops: [], nextCursor: null }),
    getDetail: vi.fn().mockResolvedValue({ shopId: 1, name: '내일네일' }),
    getReviews: vi.fn().mockResolvedValue({ reviews: [], nextCursor: null }),
  };
  const controller = new ShopQueryController(service as unknown as ShopQueryService);
  const app = express();

  app.use((req, _res, next) => {
    req.userId = 1;
    next();
  });

  app.get('/api/v1/shops', controller.getList);
  app.get('/api/v1/shops/search', controller.search);
  app.get('/api/v1/shops/:shopId/reviews', controller.getReviews);
  app.get('/api/v1/shops/:shopId', controller.getDetail);
  app.use(errorHandler);

  return { app, service };
};

describe('shop query routes', () => {
  it('샵 목록의 커서와 개수를 숫자로 변환해 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/shops?cursor=10&limit=5');

    expect(response.status).toBe(200);
    expect(service.getList).toHaveBeenCalledWith({ cursor: 10, limit: 5 }, 1);
  });

  it('샵을 키워드로 검색한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/shops/search?keyword=상도&limit=10');

    expect(response.status).toBe(200);
    expect(service.search).toHaveBeenCalledWith({ keyword: '상도', limit: 10 }, 1);
  });

  it('샵 상세를 ID로 조회한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/shops/1');

    expect(response.status).toBe(200);
    expect(service.getDetail).toHaveBeenCalledWith(1, 1, undefined, undefined);
  });

  it('샵 상세 조회에서 경로 shopId를 쿼리보다 우선한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/shops/1?shopId=2');

    expect(response.status).toBe(200);
    expect(service.getDetail).toHaveBeenCalledWith(1, 1, undefined, undefined);
  });

  it('리뷰 조회에서 경로 shopId를 쿼리보다 우선한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/shops/1/reviews?shopId=2&limit=10');

    expect(response.status).toBe(200);
    expect(service.getReviews).toHaveBeenCalledWith(1, 10, undefined);
  });

  it.each([
    '/api/v1/shops?limit=',
    '/api/v1/shops?limit=51',
    '/api/v1/shops/search?keyword=%20%20',
    '/api/v1/shops/not-a-number',
  ])('잘못된 조회 조건을 400으로 거절한다: %s', async (path) => {
    const { app } = createApp();

    const response = await request(app).get(path);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      resultType: 'FAIL',
      error: { code: 'INVALID_SHOP_QUERY_REQUEST' },
    });
  });
});
