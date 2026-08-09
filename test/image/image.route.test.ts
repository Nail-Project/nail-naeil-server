import express from 'express';
import request from 'supertest';
import { describe, expect, it, beforeAll } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import imageRouter from '../../src/image/image.route';

describe('POST /api/v1/image/upload', () => {
  beforeAll(() => {
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  });

  const createApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api/v1/image', imageRouter);
    app.use(errorHandler);
    return app;
  };

  it('Authorization 헤더가 없으면 401을 반환한다(로그인 없는 업로드 어뷰징 방지)', async () => {
    const app = createApp();

    const response = await request(app).post('/api/v1/image/upload');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
  });

  it('토큰이 유효하지 않으면 401을 반환한다', async () => {
    const app = createApp();

    const response = await request(app)
      .post('/api/v1/image/upload')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('TOKEN_INVALID');
  });
});
