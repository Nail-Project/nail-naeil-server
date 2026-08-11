import { describe, expect, it, vi, beforeEach } from 'vitest';

// getPrisma를 mock해 DB 없이 예약 조회 결과를 제어한다.
const { findManyMock } = vi.hoisted(() => ({ findManyMock: vi.fn() }));
vi.mock('../../src/infra/prisma', () => ({
  getPrisma: () => ({ reservation: { findMany: findManyMock } }),
}));

import {
  runReservationReminderScheduler,
  getReminderWindows,
  formatReminderText,
  formatKstDateTime,
} from '../../src/scheduler/reservation-reminder.scheduler';
import type { TextSmsClient } from '../../src/external/coolsms/sms.client';
import type { NotificationSettingRepository } from '../../src/notification/repository/notification-setting.repository';

const reservationRow = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: 1n,
  userId: 1,
  reservedAt: new Date('2026-08-10T05:00:00Z'),
  user: { phoneNumber: '01012345678' },
  proposal: { shop: { name: '영찬 네일 강남점' } },
  ...overrides,
});

const fakeSmsClient = () =>
  ({ sendText: vi.fn().mockResolvedValue(undefined) }) as unknown as TextSmsClient & {
    sendText: ReturnType<typeof vi.fn>;
  };

const fakeSettingRepository = (enabled: boolean) =>
  ({
    isCategoryEnabled: vi.fn().mockResolvedValue(enabled),
  }) as unknown as NotificationSettingRepository;

beforeEach(() => {
  findManyMock.mockReset();
});

describe('getReminderWindows', () => {
  it('KST 달력 기준 오늘/내일 자정 경계를 계산한다', () => {
    // 2026-08-09T05:00:00Z = KST 2026-08-09 14:00
    const now = new Date('2026-08-09T05:00:00Z');
    const { dayOf, dayBefore } = getReminderWindows(now);

    // 오늘(8/9) 00:00 KST = 8/8 15:00 UTC ~ 8/10 00:00 KST = 8/9 15:00 UTC
    expect(dayOf.start.toISOString()).toBe('2026-08-08T15:00:00.000Z');
    expect(dayOf.end.toISOString()).toBe('2026-08-09T15:00:00.000Z');
    // 내일(8/10) 00:00 KST = 8/9 15:00 UTC ~ 8/11 00:00 KST = 8/10 15:00 UTC
    expect(dayBefore.start.toISOString()).toBe('2026-08-09T15:00:00.000Z');
    expect(dayBefore.end.toISOString()).toBe('2026-08-10T15:00:00.000Z');
  });
});

describe('formatReminderText / formatKstDateTime', () => {
  it('KST 시각을 M월 D일 HH:MM으로 표기한다', () => {
    expect(formatKstDateTime(new Date('2026-08-09T05:30:00Z'))).toBe('8월 9일 14:30');
  });

  it('하루 전/당일 문구를 구분한다', () => {
    const reservedAt = new Date('2026-08-10T05:00:00Z');
    expect(formatReminderText('DAY_BEFORE', '영찬 네일', reservedAt)).toContain('내일 영찬 네일');
    expect(formatReminderText('DAY_OF', '영찬 네일', reservedAt)).toContain('오늘 영찬 네일');
  });
});

describe('runReservationReminderScheduler', () => {
  it('예약 알림을 켠, 전화번호가 있는 사용자에게 리마인더 문자를 발송한다', async () => {
    // 첫 호출(DAY_BEFORE)에만 예약 1건, 둘째 호출(DAY_OF)은 없음
    findManyMock.mockResolvedValueOnce([reservationRow()]).mockResolvedValueOnce([]);
    const smsClient = fakeSmsClient();

    await runReservationReminderScheduler({
      smsClient,
      settingRepository: fakeSettingRepository(true),
      now: new Date('2026-08-09T05:00:00Z'),
    });

    expect(smsClient.sendText).toHaveBeenCalledOnce();
    expect(smsClient.sendText).toHaveBeenCalledWith(
      '01012345678',
      expect.stringContaining('내일 영찬 네일 강남점'),
    );
  });

  it('전화번호가 없는 예약은 건너뛴다', async () => {
    findManyMock
      .mockResolvedValueOnce([reservationRow({ user: { phoneNumber: null } })])
      .mockResolvedValueOnce([]);
    const smsClient = fakeSmsClient();

    await runReservationReminderScheduler({
      smsClient,
      settingRepository: fakeSettingRepository(true),
      now: new Date('2026-08-09T05:00:00Z'),
    });

    expect(smsClient.sendText).not.toHaveBeenCalled();
  });

  it('예약 알림을 끈 사용자에게는 문자를 보내지 않는다', async () => {
    findManyMock.mockResolvedValueOnce([reservationRow()]).mockResolvedValueOnce([]);
    const smsClient = fakeSmsClient();

    await runReservationReminderScheduler({
      smsClient,
      settingRepository: fakeSettingRepository(false),
      now: new Date('2026-08-09T05:00:00Z'),
    });

    expect(smsClient.sendText).not.toHaveBeenCalled();
  });

  it('문자 발송이 실패해도 스케줄러는 예외 없이 끝난다(격리)', async () => {
    findManyMock.mockResolvedValueOnce([reservationRow()]).mockResolvedValueOnce([]);
    const smsClient = {
      sendText: vi.fn().mockRejectedValue(new Error('sms down')),
    } as unknown as TextSmsClient;

    await expect(
      runReservationReminderScheduler({
        smsClient,
        settingRepository: fakeSettingRepository(true),
        now: new Date('2026-08-09T05:00:00Z'),
      }),
    ).resolves.toBeUndefined();
  });

  it('DB 조회가 실패해도 예외를 던지지 않는다(unhandled rejection으로 인한 서버 크래시 방지)', async () => {
    findManyMock.mockRejectedValueOnce(new Error('DB connection lost'));
    const smsClient = fakeSmsClient();

    await expect(
      runReservationReminderScheduler({
        smsClient,
        settingRepository: fakeSettingRepository(true),
        now: new Date('2026-08-09T05:00:00Z'),
      }),
    ).resolves.toBeUndefined();
    expect(smsClient.sendText).not.toHaveBeenCalled();
  });
});
