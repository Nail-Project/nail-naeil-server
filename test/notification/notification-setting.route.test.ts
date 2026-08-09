import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createNotificationSettingRouter } from '../../src/notification/notification-setting.route';
import type { NotificationSettingService } from '../../src/notification/service/notification-setting.service';

// 라우트 테스트에서는 JWT 검증 없이 userId만 주입되면 충분하므로 인증 미들웨어를 mock으로 대체한다.
vi.mock('../../src/user/middlewares/user-auth.middleware', () => ({
  authenticate: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.userId = 1;
    req.role = 'CUSTOMER';
    next();
  },
}));

const createApp = () => {
  const service = {
    getSettings: vi.fn().mockResolvedValue({
      estimateEnabled: true,
      reservationEnabled: true,
      marketingEnabled: true,
    }),
    updateSettings: vi.fn().mockResolvedValue({
      estimateEnabled: false,
      reservationEnabled: true,
      marketingEnabled: true,
    }),
  };
  const app = express();

  app.use(express.json());
  app.use(
    '/api/v1/notifications',
    createNotificationSettingRouter(service as unknown as NotificationSettingService),
  );
  app.use(errorHandler);

  return { app, service };
};

describe('GET /api/v1/notifications/settings', () => {
  it('200으로 응답하고 서비스에 userId를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/notifications/settings');

    expect(response.status).toBe(200);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(response.body.success).toEqual({
      estimateEnabled: true,
      reservationEnabled: true,
      marketingEnabled: true,
    });
    expect(service.getSettings).toHaveBeenCalledWith(1);
  });
});

describe('PATCH /api/v1/notifications/settings', () => {
  it('부분 수정 값을 서비스에 전달하고 갱신된 설정을 반환한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .patch('/api/v1/notifications/settings')
      .send({ estimateEnabled: false });

    expect(response.status).toBe(200);
    expect(response.body.success).toMatchObject({ estimateEnabled: false });
    expect(service.updateSettings).toHaveBeenCalledWith(1, { estimateEnabled: false });
  });

  it('정의되지 않은 키가 오면 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .patch('/api/v1/notifications/settings')
      .send({ unknownField: true });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_NOTIFICATION_SETTING_REQUEST');
    expect(service.updateSettings).not.toHaveBeenCalled();
  });

  it('boolean이 아닌 값이 오면 400으로 응답한다', async () => {
    const { app, service } = createApp();

    const response = await request(app)
      .patch('/api/v1/notifications/settings')
      .send({ estimateEnabled: 'nope' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_NOTIFICATION_SETTING_REQUEST');
    expect(service.updateSettings).not.toHaveBeenCalled();
  });
});
