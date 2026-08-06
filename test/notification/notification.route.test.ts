import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { errorHandler } from '../../src/common/middlewares/error-handler.middleware';
import { createNotificationRouter } from '../../src/notification/notification.route';
import type { NotificationService } from '../../src/notification/service/notification.service';
import { encodeCursor } from '../../src/common/pagination/cursor';

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
    getMyNotifications: vi.fn().mockResolvedValue({
      notifications: [],
      unreadCount: 0,
      nextCursor: null,
      hasNext: false,
    }),
    markAsRead: vi.fn().mockResolvedValue(undefined),
    markAllAsRead: vi.fn().mockResolvedValue({ updatedCount: 0 }),
  };
  const app = express();

  app.use(express.json());
  app.use('/api/v1/notifications', createNotificationRouter(service as unknown as NotificationService));
  app.use(errorHandler);

  return { app, service };
};

describe('GET /api/v1/notifications', () => {
  it('쿼리가 없으면 200으로 응답하고 기본 size로 서비스를 호출한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/notifications');

    expect(response.status).toBe(200);
    expect(response.body.resultType).toBe('SUCCESS');
    expect(service.getMyNotifications).toHaveBeenCalledWith(1, { size: 20 });
  });

  it('unread/cursor/size를 디코딩해 서비스에 전달한다', async () => {
    const { app, service } = createApp();
    const cursor = encodeCursor({ createdAt: '2026-07-31T00:00:00.000Z', id: 5 });

    const response = await request(app)
      .get('/api/v1/notifications')
      .query({ unread: 'true', cursor, size: '10' });

    expect(response.status).toBe(200);
    expect(service.getMyNotifications).toHaveBeenCalledWith(1, {
      unread: true,
      cursor: { createdAt: new Date('2026-07-31T00:00:00.000Z'), id: 5 },
      size: 10,
    });
  });

  it('size 상한을 초과하면 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app).get('/api/v1/notifications').query({ size: '101' });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_NOTIFICATION_REQUEST');
    expect(service.getMyNotifications).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/v1/notifications/:notificationId/read', () => {
  it('정상 id면 200으로 응답하고 서비스에 (userId, id)를 전달한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).patch('/api/v1/notifications/5/read');

    expect(response.status).toBe(200);
    expect(response.body.success).toEqual({ notificationId: 5, isRead: true });
    expect(service.markAsRead).toHaveBeenCalledWith(1, 5);
  });

  it('숫자가 아닌 id는 400으로 응답하고 서비스를 호출하지 않는다', async () => {
    const { app, service } = createApp();

    const response = await request(app).patch('/api/v1/notifications/abc/read');

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_NOTIFICATION_ID');
    expect(service.markAsRead).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/v1/notifications/read-all', () => {
  it('200으로 응답하고 전체 읽음 처리 건수를 반환한다', async () => {
    const { app, service } = createApp();

    const response = await request(app).patch('/api/v1/notifications/read-all');

    expect(response.status).toBe(200);
    expect(service.markAllAsRead).toHaveBeenCalledWith(1);
  });
});
