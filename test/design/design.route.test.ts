import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createDesignRouter } from '../../src/design/design.route';
import type { DesignService } from '../../src/design/service/design.service';
import { DesignNotFoundError } from '../../src/design/error/design.error';
import { encodeCursor } from '../../src/common/pagination/cursor';

// 라우트 테스트에서는 JWT 검증 없이 userId만 주입되면 충분하므로 미들웨어를 mock으로 대체한다.
vi.mock('../../src/common/middlewares/auth.middleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = 1;
    req.role = 'USER';
    next();
  },
}));

const USER_ID = 1;

const createApp = () => {
  const service = {
    getDesigns: vi.fn().mockResolvedValue({
      designs: [],
      pageInfo: { nextCursor: null, hasNext: false },
    }),
    getDesignDetail: vi.fn().mockResolvedValue({
      designId: 1,
      title: '도트 프렌치 네일',
      images: ['https://.../design1.jpg'],
      tags: ['여름네일', '아트'],
      viewCount: 7600,
      wishCount: 901,
      durationMinutes: 90,
      difficulty: '높음',
      recommendedShape: '스퀘어',
      description: '설명',
      isBookmarked: false,
    }),
    createWish: vi.fn().mockResolvedValue({ isBookmarked: true, wishCount: 902 }),
    deleteWish: vi.fn().mockResolvedValue({ isBookmarked: false, wishCount: 900 }),
    getWishlist: vi.fn().mockResolvedValue({
      designs: [],
      pageInfo: { nextCursor: null, hasNext: false },
    }),
  };
  const app = express();

  app.use(express.json());
  app.use('/api/v1/designs', createDesignRouter(service as unknown as DesignService));
  app.use(errorHandler);

  return { app, service };
};

describe('GET /api/v1/designs', () => {
  it('기본 size로 200을 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs');

    expect(response.status).toBe(200);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(service.getDesigns).toHaveBeenCalledWith(undefined, undefined, 10);
  });

  it('cursor/size를 전달하면 디코딩해서 서비스에 전달한다', async () => {
    const { app, service } = createApp();
    const cursor = encodeCursor({ createdAt: '2026-07-27T04:59:00.000Z', id: 5 });

    const response = await request(app).get('/api/v1/designs').query({ cursor, size: '20' });

    expect(response.status).toBe(200);
    expect(service.getDesigns).toHaveBeenCalledWith(
      { createdAt: new Date('2026-07-27T04:59:00.000Z'), id: 5 },
      undefined,
      20,
    );
  });

  it('category를 전달하면 그대로 서비스에 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs').query({ category: '심플' });

    expect(response.status).toBe(200);
    expect(service.getDesigns).toHaveBeenCalledWith(undefined, '심플', 10);
  });

  it('형식이 깨진 cursor는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs').query({ cursor: 'not-valid' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_REQUEST');
    expect(service.getDesigns).not.toHaveBeenCalled();
  });

  it('같은 쿼리 키를 반복해 배열이 되면 400으로 거부한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs?size=1&size=2');

    expect(response.status).toBe(400);
    expect(service.getDesigns).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/designs/:designId', () => {
  it('정상적인 id는 200으로 응답하고 서비스에 숫자 id와 인증된 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs/1');

    expect(response.status).toBe(200);
    expect(response.body.success.isBookmarked).toBe(false);
    expect(service.getDesignDetail).toHaveBeenCalledWith(1, USER_ID);
  });

  it('존재하지 않는 디자인이면 404와 전용 에러 코드를 응답한다', async () => {
    const { app, service } = createApp();
    service.getDesignDetail.mockRejectedValueOnce(new DesignNotFoundError());

    const response = await request(app).get('/api/v1/designs/999');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESIGN_NOT_FOUND');
  });

  it('숫자가 아닌 id는 400으로 응답하고 전용 에러 코드를 반환한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs/not-a-number');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_ID');
    expect(service.getDesignDetail).not.toHaveBeenCalled();
  });

  it('0 이하의 id는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs/0');

    expect(response.status).toBe(400);
    expect(service.getDesignDetail).not.toHaveBeenCalled();
  });
});

describe('POST /api/v1/designs/:designId/wish', () => {
  it('정상적인 id는 200으로 응답하고 서비스에 숫자 id와 인증된 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/designs/1/wish');

    expect(response.status).toBe(200);
    expect(response.body.success).toEqual({ isBookmarked: true, wishCount: 902 });
    expect(service.createWish).toHaveBeenCalledWith(1, USER_ID);
  });

  it('존재하지 않는 디자인이면 404와 전용 에러 코드를 응답한다', async () => {
    const { app, service } = createApp();
    service.createWish.mockRejectedValueOnce(new DesignNotFoundError());

    const response = await request(app).post('/api/v1/designs/999/wish');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESIGN_NOT_FOUND');
  });

  it('숫자가 아닌 id는 400으로 응답하고 전용 에러 코드를 반환한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/designs/not-a-number/wish');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_ID');
    expect(service.createWish).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/designs/:designId/wish', () => {
  it('정상적인 id는 200으로 응답하고 서비스에 숫자 id와 인증된 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).delete('/api/v1/designs/1/wish');

    expect(response.status).toBe(200);
    expect(response.body.success).toEqual({ isBookmarked: false, wishCount: 900 });
    expect(service.deleteWish).toHaveBeenCalledWith(1, USER_ID);
  });

  it('존재하지 않는 디자인이면 404와 전용 에러 코드를 응답한다', async () => {
    const { app, service } = createApp();
    service.deleteWish.mockRejectedValueOnce(new DesignNotFoundError());

    const response = await request(app).delete('/api/v1/designs/999/wish');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESIGN_NOT_FOUND');
  });

  it('숫자가 아닌 id는 400으로 응답하고 전용 에러 코드를 반환한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).delete('/api/v1/designs/not-a-number/wish');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_ID');
    expect(service.deleteWish).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/designs/wishlist', () => {
  it('기본 size로 200을 응답하고 인증된 userId를 서비스에 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs/wishlist');

    expect(response.status).toBe(200);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(service.getWishlist).toHaveBeenCalledWith(USER_ID, undefined, 10);
  });

  it('cursor/size를 전달하면 디코딩해서 서비스에 전달한다', async () => {
    const { app, service } = createApp();
    const cursor = encodeCursor({ createdAt: '2026-08-01T04:59:00.000Z', id: 5 });

    const response = await request(app)
      .get('/api/v1/designs/wishlist')
      .query({ cursor, size: '20' });

    expect(response.status).toBe(200);
    expect(service.getWishlist).toHaveBeenCalledWith(
      USER_ID,
      { createdAt: new Date('2026-08-01T04:59:00.000Z'), id: 5 },
      20,
    );
  });

  it('형식이 깨진 cursor는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .get('/api/v1/designs/wishlist')
      .query({ cursor: 'not-valid' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_REQUEST');
    expect(service.getWishlist).not.toHaveBeenCalled();
  });

  it("'wishlist'가 :designId 라우트로 잘못 매칭되지 않고 getWishlist가 호출된다", async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs/wishlist');

    expect(response.status).toBe(200);
    expect(service.getWishlist).toHaveBeenCalled();
    expect(service.getDesignDetail).not.toHaveBeenCalled();
  });
});
