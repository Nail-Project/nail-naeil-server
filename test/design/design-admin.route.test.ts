import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi, beforeAll } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createDesignAdminRouter } from '../../src/design/design-admin.route';
import type { DesignAdminService } from '../../src/design/service/design-admin.service';
import { DesignNotFoundError } from '../../src/design/error/design.error';

const ADMIN_KEY = 'test-design-admin-key';

beforeAll(() => {
  process.env.DESIGN_ADMIN_KEY = ADMIN_KEY;
});

const validPayload = {
  title: '글리터 프렌치',
  imageUrl: 'https://.../design1.jpg',
  durationMinutes: 60,
  difficulty: '보통',
  recommendedShape: '라운드',
  description: '설명',
};

const adminResponse = {
  designId: 1,
  title: '글리터 프렌치',
  imageUrl: 'https://.../design1.jpg',
  images: [],
  tags: [],
  durationMinutes: 60,
  difficulty: '보통',
  recommendedShape: '라운드',
  description: '설명',
};

const createApp = () => {
  const service = {
    createDesign: vi.fn().mockResolvedValue(adminResponse),
    updateDesign: vi.fn().mockResolvedValue(adminResponse),
    deleteDesign: vi.fn().mockResolvedValue(undefined),
  };
  const app = express();

  app.use(express.json());
  app.use('/admin/api/v1/designs', createDesignAdminRouter(service as unknown as DesignAdminService));
  app.use(errorHandler);

  return { app, service };
};

describe('POST /admin/api/v1/designs', () => {
  it('관리자 키 없이 요청하면 401로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/admin/api/v1/designs').send(validPayload);

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHORIZED_DESIGN_ADMIN');
    expect(service.createDesign).not.toHaveBeenCalled();
  });

  it('관리자 키가 틀리면 401로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/admin/api/v1/designs')
      .set('x-admin-design-key', 'wrong-key')
      .send(validPayload);

    expect(response.status).toBe(401);
    expect(service.createDesign).not.toHaveBeenCalled();
  });

  it('올바른 키로 요청하면 201과 함께 생성 결과를 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .post('/admin/api/v1/designs')
      .set('x-admin-design-key', ADMIN_KEY)
      .send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.success).toEqual(adminResponse);
    expect(service.createDesign).toHaveBeenCalledWith({ ...validPayload, images: [], tags: [] });
  });

  it('필수 필드가 없으면 400으로 응답한다', async () => {
    const { app, service } = createApp();
    const { title: _title, ...rest } = validPayload;

    const response = await request(app)
      .post('/admin/api/v1/designs')
      .set('x-admin-design-key', ADMIN_KEY)
      .send(rest);

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_ADMIN_REQUEST');
    expect(service.createDesign).not.toHaveBeenCalled();
  });
});

describe('PATCH /admin/api/v1/designs/:designId', () => {
  it('관리자 키 없이 요청하면 401로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).patch('/admin/api/v1/designs/1').send({ title: 'x' });

    expect(response.status).toBe(401);
    expect(service.updateDesign).not.toHaveBeenCalled();
  });

  it('올바른 키 + 유효한 id면 200과 함께 수정 결과를 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .patch('/admin/api/v1/designs/1')
      .set('x-admin-design-key', ADMIN_KEY)
      .send({ title: '수정된 제목' });

    expect(response.status).toBe(200);
    expect(response.body.success).toEqual(adminResponse);
    expect(service.updateDesign).toHaveBeenCalledWith(1, { title: '수정된 제목' });
  });

  it('숫자가 아닌 id는 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .patch('/admin/api/v1/designs/not-a-number')
      .set('x-admin-design-key', ADMIN_KEY)
      .send({ title: 'x' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_ID');
    expect(service.updateDesign).not.toHaveBeenCalled();
  });

  it('빈 객체를 보내면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .patch('/admin/api/v1/designs/1')
      .set('x-admin-design-key', ADMIN_KEY)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DESIGN_ADMIN_REQUEST');
    expect(service.updateDesign).not.toHaveBeenCalled();
  });

  it('존재하지 않는 디자인이면 404로 응답한다', async () => {
    const { app, service } = createApp();
    service.updateDesign.mockRejectedValueOnce(new DesignNotFoundError());

    const response = await request(app)
      .patch('/admin/api/v1/designs/999')
      .set('x-admin-design-key', ADMIN_KEY)
      .send({ title: 'x' });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESIGN_NOT_FOUND');
  });
});

describe('DELETE /admin/api/v1/designs/:designId', () => {
  it('관리자 키 없이 요청하면 401로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).delete('/admin/api/v1/designs/1');

    expect(response.status).toBe(401);
    expect(service.deleteDesign).not.toHaveBeenCalled();
  });

  it('올바른 키 + 유효한 id면 204로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .delete('/admin/api/v1/designs/1')
      .set('x-admin-design-key', ADMIN_KEY);

    expect(response.status).toBe(204);
    expect(service.deleteDesign).toHaveBeenCalledWith(1);
  });

  it('존재하지 않는 디자인이면 404로 응답한다', async () => {
    const { app, service } = createApp();
    service.deleteDesign.mockRejectedValueOnce(new DesignNotFoundError());

    const response = await request(app)
      .delete('/admin/api/v1/designs/999')
      .set('x-admin-design-key', ADMIN_KEY);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('DESIGN_NOT_FOUND');
  });
});
