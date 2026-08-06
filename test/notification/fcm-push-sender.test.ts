import { describe, expect, it, vi, beforeEach } from 'vitest';
import { FcmPushSender } from '../../src/notification/push/fcm-push-sender';
import type { DeviceTokenRepository } from '../../src/device-token/repository/device-token.repository';
import { getFirebaseMessaging } from '../../src/infra/firebase';

// firebase-admin 초기화를 피하기 위해 messaging 획득 함수를 mock으로 대체한다.
vi.mock('../../src/infra/firebase', () => ({
  getFirebaseMessaging: vi.fn(),
}));

const sendEachForMulticast = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  (getFirebaseMessaging as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    sendEachForMulticast,
  });
});

const createRepo = (tokens: string[]) => ({
  findTokensByUser: vi.fn().mockResolvedValue(tokens),
  deleteByTokens: vi.fn().mockResolvedValue({ count: 0 }),
  upsert: vi.fn(),
  deleteByToken: vi.fn(),
});

describe('FcmPushSender', () => {
  it('등록된 토큰이 없으면 FCM을 호출하지 않는다', async () => {
    const repo = createRepo([]);
    const sender = new FcmPushSender(repo as unknown as DeviceTokenRepository);

    await sender.send({ userId: 1, title: '제목', body: '내용' });

    expect(sendEachForMulticast).not.toHaveBeenCalled();
  });

  it('사용자의 모든 토큰으로 멀티캐스트 발송하고 data를 문자열 맵으로 변환한다', async () => {
    const repo = createRepo(['t1', 't2']);
    sendEachForMulticast.mockResolvedValue({ responses: [{ success: true }, { success: true }] });
    const sender = new FcmPushSender(repo as unknown as DeviceTokenRepository);

    await sender.send({ userId: 1, title: '제목', body: '내용', data: { reservationId: 12 } });

    expect(sendEachForMulticast).toHaveBeenCalledWith({
      tokens: ['t1', 't2'],
      notification: { title: '제목', body: '내용' },
      data: { reservationId: '12' },
    });
    expect(repo.deleteByTokens).not.toHaveBeenCalled();
  });

  it('무효 토큰 응답은 저장소에서 정리한다', async () => {
    const repo = createRepo(['valid', 'stale']);
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
      ],
    });
    const sender = new FcmPushSender(repo as unknown as DeviceTokenRepository);

    await sender.send({ userId: 1, title: '제목', body: '내용' });

    expect(repo.deleteByTokens).toHaveBeenCalledWith(['stale']);
  });

  it('invalid-argument 실패는 토큰 문제가 아닐 수 있으므로 삭제하지 않는다', async () => {
    const repo = createRepo(['t1', 't2']);
    sendEachForMulticast.mockResolvedValue({
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/invalid-argument' } },
      ],
    });
    const sender = new FcmPushSender(repo as unknown as DeviceTokenRepository);

    await sender.send({ userId: 1, title: '제목', body: '내용' });

    expect(repo.deleteByTokens).not.toHaveBeenCalled();
  });

  it('토큰이 500개를 넘으면 500개씩 나눠 발송하고 무효 토큰을 합쳐 정리한다', async () => {
    const tokens = Array.from({ length: 600 }, (_, i) => `t${i}`);
    const repo = createRepo(tokens);
    // 첫 배치(500): 마지막 토큰 t499 무효 / 둘째 배치(100): 마지막 토큰 t599 무효
    sendEachForMulticast
      .mockResolvedValueOnce({
        responses: tokens.slice(0, 500).map((_, i) =>
          i === 499
            ? { success: false, error: { code: 'messaging/invalid-registration-token' } }
            : { success: true },
        ),
      })
      .mockResolvedValueOnce({
        responses: tokens.slice(500).map((_, i) =>
          i === 99
            ? { success: false, error: { code: 'messaging/registration-token-not-registered' } }
            : { success: true },
        ),
      });
    const sender = new FcmPushSender(repo as unknown as DeviceTokenRepository);

    await sender.send({ userId: 1, title: '제목', body: '내용' });

    expect(sendEachForMulticast).toHaveBeenCalledTimes(2);
    expect(sendEachForMulticast.mock.calls[0][0].tokens).toHaveLength(500);
    expect(sendEachForMulticast.mock.calls[1][0].tokens).toHaveLength(100);
    expect(repo.deleteByTokens).toHaveBeenCalledWith(['t499', 't599']);
  });
});
