import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createDeviceTokenRouter } from '../../src/device-token/device-token.route';
import type { DeviceTokenService } from '../../src/device-token/service/device-token.service';

// 라우트 테스트에서는 JWT 검증 없이 userId만 주입되면 충분하므로 인증 미들웨어를 mock으로 대체한다.
vi.mock('../../src/common/middlewares/auth.middleware', () => ({
  authMiddleware: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = 1;
    req.role = 'CUSTOMER';
    next();
  },
}));

const createApp = () => {
  const service = {
    register: vi.fn().mockResolvedValue(undefined),
    unregister: vi.fn().mockResolvedValue(undefined),
  };
  const app = express();

  app.use(express.json());
  app.use(
    '/api/v1/device-tokens',
    createDeviceTokenRouter(service as unknown as DeviceTokenService),
  );
  app.use(errorHandler);

  return { app, service };
};

describe('POST /api/v1/device-tokens', () => {
  it('토큰을 등록하고 200으로 응답한다(platform 미지정 시 ANDROID 기본값)', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/device-tokens').send({ token: 'fcm-token-1' });

    expect(response.status).toBe(200);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(service.register).toHaveBeenCalledWith(1, { token: 'fcm-token-1', platform: 'ANDROID' });
  });

  it('token이 없으면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).post('/api/v1/device-tokens').send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_DEVICE_TOKEN_REQUEST');
    expect(service.register).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/v1/device-tokens', () => {
  it('토큰을 해제하고 200으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .delete('/api/v1/device-tokens')
      .send({ token: 'fcm-token-1' });

    expect(response.status).toBe(200);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(service.unregister).toHaveBeenCalledWith(1, 'fcm-token-1');
  });
});
