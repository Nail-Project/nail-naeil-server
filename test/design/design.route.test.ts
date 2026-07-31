import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createDesignRouter } from '../../src/design/design.route';
import type { DesignService } from '../../src/design/service/design.service';

const TEMP_USER_ID = 1;

const createApp = () => {
  const service = {
    getDesigns: vi.fn().mockResolvedValue({
      designs: [],
      pageInfo: { currentPage: 1, pageSize: 10, totalElements: 0, hasNext: false },
    }),
    getDesignDetail: vi.fn().mockResolvedValue({
      designId: 1,
      title: '도트 프렌치 네일',
      images: ['https://.../design1.jpg'],
      tag: '여름네일,아트',
      viewCount: 7600,
      wishCount: 901,
      durationMinutes: 90,
      difficulty: '높음',
      recommendedShape: '스퀘어',
      description: '설명',
      isBookmarked: false,
    }),
  };
  const app = express();

  app.use(express.json());
  app.use('/api/v1/designs', createDesignRouter(service as unknown as DesignService));
  app.use(errorHandler);

  return { app, service };
};

describe('GET /api/v1/designs', () => {
  it('기본 page/size로 200을 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs');

    expect(response.status).toBe(200);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(service.getDesigns).toHaveBeenCalledWith(1, 10);
  });

  it('page/size를 전달하면 그대로 서비스에 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs').query({ page: '2', size: '20' });

    expect(response.status).toBe(200);
    expect(service.getDesigns).toHaveBeenCalledWith(2, 20);
  });

  it('page가 0이면 400으로 응답한다 (1부터 시작)', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs').query({ page: '0' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_REQUEST');
    expect(service.getDesigns).not.toHaveBeenCalled();
  });

  it('같은 쿼리 키를 반복해 배열이 되면 400으로 거부한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs?page=1&page=2');

    expect(response.status).toBe(400);
    expect(service.getDesigns).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/designs/:designId', () => {
  it('정상적인 id는 200으로 응답하고 서비스에 숫자와 임시 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/designs/1');

    expect(response.status).toBe(200);
    expect(response.body.success.isBookmarked).toBe(false);
    expect(service.getDesignDetail).toHaveBeenCalledWith(1, TEMP_USER_ID);
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
