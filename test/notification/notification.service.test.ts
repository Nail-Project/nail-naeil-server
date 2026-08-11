import { describe, expect, it, vi } from 'vitest';
import { NotificationService } from '../../src/notification/service/notification.service';
import type { NotificationRepository } from '../../src/notification/repository/notification.repository';
import type { PushSender } from '../../src/notification/push/push-sender';
import type { NotificationSettingRepository } from '../../src/notification/repository/notification-setting.repository';
import { encodeCursor } from '../../src/common/pagination/cursor';

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

// 필요한 메서드만 가진 fake repository/pushSender/설정 repository를 만들어 주입한다.
// 설정 repository 기본값은 항상 ON(isCategoryEnabled=true)이라 기존 발송 테스트에 영향을 주지 않는다.
const createService = (
  repo: Partial<NotificationRepository>,
  push?: Partial<PushSender>,
  settingRepo?: Partial<NotificationSettingRepository>,
) =>
  new NotificationService(
    repo as unknown as NotificationRepository,
    (push as PushSender) ?? { send: vi.fn().mockResolvedValue(undefined) },
    (settingRepo as NotificationSettingRepository) ?? {
      isCategoryEnabled: vi.fn().mockResolvedValue(true),
    },
  );

describe('NotificationService.getMyNotifications', () => {
  it('마지막 페이지면 nextCursor=null, hasNext=false로 응답 DTO를 반환한다', async () => {
    // size(20)보다 적게 반환 → 다음 페이지 없음
    const findManyByUser = vi.fn().mockResolvedValue([notificationRecord()]);
    const countUnreadByUser = vi.fn().mockResolvedValue(3);
    const service = createService({ findManyByUser, countUnreadByUser });

    const result = await service.getMyNotifications(1, { size: 20 });

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
      nextCursor: null,
      hasNext: false,
    });
  });

  it('unread/cursor/size를 repository에 그대로 전달한다', async () => {
    const findManyByUser = vi.fn().mockResolvedValue([]);
    const countUnreadByUser = vi.fn().mockResolvedValue(0);
    const service = createService({ findManyByUser, countUnreadByUser });
    const cursor = { createdAt: new Date('2026-07-31T00:00:00Z'), id: 7 };

    await service.getMyNotifications(1, { unread: true, cursor, size: 10 });

    expect(findManyByUser).toHaveBeenCalledWith(1, { unread: true, cursor, take: 10 });
  });

  it('size보다 1개 더 오면 hasNext=true, 마지막 노출 항목으로 nextCursor를 만든다', async () => {
    const r1 = notificationRecord({ id: 1, createdAt: new Date('2026-07-31T03:00:00Z') });
    const r2 = notificationRecord({ id: 2, createdAt: new Date('2026-07-31T02:00:00Z') });
    const r3 = notificationRecord({ id: 3, createdAt: new Date('2026-07-31T01:00:00Z') });
    const findManyByUser = vi.fn().mockResolvedValue([r1, r2, r3]);
    const countUnreadByUser = vi.fn().mockResolvedValue(0);
    const service = createService({ findManyByUser, countUnreadByUser });

    const result = await service.getMyNotifications(1, { size: 2 });

    expect(result.hasNext).toBe(true);
    expect(result.notifications).toHaveLength(2);
    expect(result.nextCursor).toBe(
      encodeCursor({ createdAt: new Date('2026-07-31T02:00:00Z'), id: 2 }),
    );
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

describe('NotificationService.notify', () => {
  it('DB에 알림을 저장하고 푸시를 발송한다', async () => {
    const create = vi.fn().mockResolvedValue(notificationRecord());
    const send = vi.fn().mockResolvedValue(undefined);
    const service = createService({ create }, { send });

    await service.notify({
      userId: 1,
      type: 'ESTIMATE_RESPONSE',
      title: '견적 답변이 도착했어요',
      body: '요청하신 견적에 새 답변이 도착했어요.',
      data: { estimateRequestId: 12 },
    });

    expect(create).toHaveBeenCalledWith({
      userId: 1,
      type: 'ESTIMATE_RESPONSE',
      title: '견적 답변이 도착했어요',
      body: '요청하신 견적에 새 답변이 도착했어요.',
      data: { estimateRequestId: 12 },
    });
    expect(send).toHaveBeenCalledOnce();
  });

  it('푸시 발송이 실패해도 notify는 성공한다(격리)', async () => {
    const create = vi.fn().mockResolvedValue(notificationRecord());
    const send = vi.fn().mockRejectedValue(new Error('fcm down'));
    const service = createService({ create }, { send });

    await expect(
      service.notify({ userId: 1, type: 'RESERVATION_STATUS', title: 't', body: 'b' }),
    ).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledOnce();
  });

  it('사용자가 해당 카테고리 알림을 껐으면 저장·발송을 모두 건너뛴다', async () => {
    const create = vi.fn();
    const send = vi.fn();
    const service = createService(
      { create },
      { send },
      { isCategoryEnabled: vi.fn().mockResolvedValue(false) },
    );

    await service.notify({
      userId: 1,
      type: 'ESTIMATE_RESPONSE',
      title: '견적 답변이 도착했어요',
      body: '요청하신 견적에 새 답변이 도착했어요.',
    });

    expect(create).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
