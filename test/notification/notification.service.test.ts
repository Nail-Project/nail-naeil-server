import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from '../../src/notification/service/notification.service';
import type { NotificationRepository } from '../../src/notification/repository/notification.repository';

// Prisma Notification 레코드 형태의 최소 fake 데이터
const notificationRecord = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1,
  userId: 1,
  type: 'ESTIMATE_RESPONSE',
  title: '견적 응답 도착',
  body: '요청하신 견적에 새 응답이 도착했어요.',
  data: { estimateResponseId: 10 },
  isRead: false,
  readAt: null,
  createdAt: new Date('2026-07-31T00:00:00Z'),
  ...overrides,
});

// 필요한 메서드만 가진 fake repository를 만들어 주입한다.
const createService = (repo: Partial<NotificationRepository>) =>
  new NotificationService(repo as unknown as NotificationRepository);

describe('NotificationService.getMyNotifications', () => {
  it('내 알림 목록과 안읽음 개수를 응답 DTO로 반환한다', async () => {
    const findManyByUser = vi.fn().mockResolvedValue([notificationRecord()]);
    const countUnreadByUser = vi.fn().mockResolvedValue(3);
    const service = createService({ findManyByUser, countUnreadByUser });

    const result = await service.getMyNotifications(1, { page: 0, size: 20 });

    expect(result).toEqual({
      notifications: [
        {
          notificationId: 1,
          type: 'ESTIMATE_RESPONSE',
          title: '견적 응답 도착',
          body: '요청하신 견적에 새 응답이 도착했어요.',
          data: { estimateResponseId: 10 },
          isRead: false,
          readAt: null,
          createdAt: new Date('2026-07-31T00:00:00Z'),
        },
      ],
      unreadCount: 3,
      page: 0,
      size: 20,
    });
  });

  it('page/size로 skip을 계산해 repository에 전달한다', async () => {
    const findManyByUser = vi.fn().mockResolvedValue([]);
    const countUnreadByUser = vi.fn().mockResolvedValue(0);
    const service = createService({ findManyByUser, countUnreadByUser });

    await service.getMyNotifications(1, { unread: true, page: 2, size: 10 });

    expect(findManyByUser).toHaveBeenCalledWith(1, { unread: true, skip: 20, take: 10 });
  });
});

describe('NotificationService.markAsRead', () => {
  it('본인 소유의 안읽은 알림을 읽음 처리한다', async () => {
    const markRead = vi.fn().mockResolvedValue(notificationRecord({ isRead: true }));
    const service = createService({
      findOneByUser: vi.fn().mockResolvedValue(notificationRecord()),
      markRead,
    });

    await expect(service.markAsRead(1, 1)).resolves.toBeUndefined();
    expect(markRead).toHaveBeenCalledWith(1);
  });

  it('이미 읽은 알림이면 불필요한 쓰기를 하지 않는다(멱등)', async () => {
    const markRead = vi.fn();
    const service = createService({
      findOneByUser: vi.fn().mockResolvedValue(notificationRecord({ isRead: true })),
      markRead,
    });

    await service.markAsRead(1, 1);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('본인 소유가 아니거나 없는 알림이면 NOTIFICATION_NOT_FOUND(404)를 던진다', async () => {
    const service = createService({
      findOneByUser: vi.fn().mockResolvedValue(null),
    });

    await expect(service.markAsRead(1, 999)).rejects.toMatchObject({
      code: 'NOTIFICATION_NOT_FOUND',
      statusCode: 404,
    });
  });
});

describe('NotificationService.markAllAsRead', () => {
  it('전체 읽음 처리한 건수를 반환한다', async () => {
    const service = createService({
      markAllReadByUser: vi.fn().mockResolvedValue({ count: 5 }),
    });

    await expect(service.markAllAsRead(1)).resolves.toEqual({ updatedCount: 5 });
  });
});
