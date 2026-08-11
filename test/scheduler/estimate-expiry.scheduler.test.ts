import { describe, expect, it, vi, beforeEach } from 'vitest';

// getPrisma를 mock해 DB 없이 견적 요청 조회/업데이트 결과를 제어한다.
const { findManyMock, updateManyMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  updateManyMock: vi.fn(),
}));
vi.mock('../../src/infra/prisma', () => ({
  getPrisma: () => ({
    estimateRequest: { findMany: findManyMock, updateMany: updateManyMock },
  }),
}));

import { runEstimateExpiryScheduler } from '../../src/scheduler/estimate-expiry.scheduler';
import type { NotificationService } from '../../src/notification/service/notification.service';

const fakeNotificationService = () =>
  ({ notify: vi.fn().mockResolvedValue(undefined) }) as unknown as NotificationService & {
    notify: ReturnType<typeof vi.fn>;
  };

beforeEach(() => {
  findManyMock.mockReset();
  updateManyMock.mockReset();
});

describe('runEstimateExpiryScheduler', () => {
  it('만료 대상을 EXPIRED로 전환하고 알림을 보낸다', async () => {
    findManyMock.mockResolvedValueOnce([{ id: 1, userId: 10 }]);
    updateManyMock.mockResolvedValueOnce({ count: 1 });
    const notificationService = fakeNotificationService();

    await runEstimateExpiryScheduler(notificationService);

    expect(updateManyMock).toHaveBeenCalledOnce();
    expect(notificationService.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 10, type: 'ESTIMATE_CLOSED' }),
    );
  });

  it('DB 조회가 실패해도 예외를 던지지 않는다(unhandled rejection으로 인한 서버 크래시 방지)', async () => {
    findManyMock.mockRejectedValueOnce(new Error('DB connection lost'));
    const notificationService = fakeNotificationService();

    await expect(runEstimateExpiryScheduler(notificationService)).resolves.toBeUndefined();
    expect(notificationService.notify).not.toHaveBeenCalled();
  });

  it('전환 도중 업데이트가 실패해도 예외를 던지지 않는다', async () => {
    findManyMock.mockResolvedValueOnce([{ id: 1, userId: 10 }]);
    updateManyMock.mockRejectedValueOnce(new Error('DB connection lost'));
    const notificationService = fakeNotificationService();

    await expect(runEstimateExpiryScheduler(notificationService)).resolves.toBeUndefined();
    expect(notificationService.notify).not.toHaveBeenCalled();
  });
});
