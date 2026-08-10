import { getPrisma } from '../infra/prisma';
import { NotificationSettingRepository } from '../notification/repository/notification-setting.repository';
import { SolapiTextSmsClient, type TextSmsClient } from '../external/coolsms/sms.client';

// -------------------------------------------------------------------
// 예약 리마인더 문자 스케줄러
// 대상: 예약 하루 전(내일) / 당일(오늘)인 CONFIRMED 예약
// 처리: 예약 알림을 켠 사용자에게 User.phoneNumber로 리마인더 문자를 발송한다.
// 인앱/FCM 게이트와 동일하게 "예약 알림 OFF" 사용자는 건너뛴다.
// -------------------------------------------------------------------
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

type ReminderKind = 'DAY_BEFORE' | 'DAY_OF';

// base 시점 기준, KST 달력으로 addDays일 뒤 자정을 UTC Date로 반환한다.
const kstMidnightUtc = (base: Date, addDays: number): Date => {
  const kst = new Date(base.getTime() + SEOUL_OFFSET_MS);
  return new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate() + addDays) - SEOUL_OFFSET_MS,
  );
};

// 오늘(당일)/내일(하루 전) 예약을 고르기 위한 KST 달력일 경계를 계산한다. (순수 함수 - 테스트 대상)
export const getReminderWindows = (now: Date) => ({
  dayOf: { start: kstMidnightUtc(now, 0), end: kstMidnightUtc(now, 1) },
  dayBefore: { start: kstMidnightUtc(now, 1), end: kstMidnightUtc(now, 2) },
});

// KST 기준 "M월 D일 HH:MM" 표기. (순수 함수 - 테스트 대상)
export const formatKstDateTime = (date: Date): string => {
  const kst = new Date(date.getTime() + SEOUL_OFFSET_MS);
  const month = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const hh = String(kst.getUTCHours()).padStart(2, '0');
  const mm = String(kst.getUTCMinutes()).padStart(2, '0');
  return `${month}월 ${day}일 ${hh}:${mm}`;
};

// 리마인더 문자 본문. (순수 함수 - 테스트 대상)
export const formatReminderText = (
  kind: ReminderKind,
  shopName: string,
  reservedAt: Date,
): string => {
  const when = formatKstDateTime(reservedAt);
  const dayLabel = kind === 'DAY_BEFORE' ? '내일' : '오늘';
  return `[네일내일] ${dayLabel} ${shopName} 예약이 있어요. (${when}) 잊지 말고 방문해 주세요!`;
};

// 스케줄러 진입점 - server.ts에서 node-cron으로 매일 호출한다.
// 의존성은 테스트에서 주입할 수 있도록 인자로 받는다(기본값 실제 구현).
export const runReservationReminderScheduler = async (
  deps: {
    smsClient?: TextSmsClient;
    settingRepository?: NotificationSettingRepository;
    now?: Date;
  } = {},
): Promise<void> => {
  const smsClient = deps.smsClient ?? new SolapiTextSmsClient();
  const settingRepository = deps.settingRepository ?? new NotificationSettingRepository();
  const now = deps.now ?? new Date();
  const windows = getReminderWindows(now);

  const targets: Array<{ kind: ReminderKind; start: Date; end: Date }> = [
    { kind: 'DAY_BEFORE', ...windows.dayBefore },
    { kind: 'DAY_OF', ...windows.dayOf },
  ];

  let sentCount = 0;

  // cron 콜백은 아무도 반환된 Promise를 catch하지 않고, 전역 unhandledRejection 핸들러도
  // 없다. DB 조회가 이 try 밖에서 던지면 Node 기본 동작으로 서버 프로세스 전체가 죽으므로
  // 스케줄러 실행 전체를 감싸 실패해도 로그만 남기고 프로세스는 살아있게 한다.
  try {
    for (const target of targets) {
      // 당일 리마인더는 이미 지난 시간의 예약은 제외한다(cron 실행 시각 이후 예약만).
      const gte = target.kind === 'DAY_OF' && now > target.start ? now : target.start;

      const reservations = await getPrisma().reservation.findMany({
        where: { status: 'CONFIRMED', reservedAt: { gte, lt: target.end } },
        select: {
          id: true,
          userId: true,
          reservedAt: true,
          user: { select: { phoneNumber: true } },
          proposal: { select: { shop: { select: { name: true } } } },
        },
      });

      for (const reservation of reservations) {
        const phone = reservation.user.phoneNumber;
        if (!phone) continue;

        // 예약 알림을 끈 사용자는 리마인더 문자도 보내지 않는다.
        const enabled = await settingRepository.isCategoryEnabled(
          reservation.userId,
          'reservation',
        );
        if (!enabled) continue;

        const text = formatReminderText(
          target.kind,
          reservation.proposal.shop.name,
          reservation.reservedAt,
        );

        try {
          await smsClient.sendText(phone, text);
          sentCount += 1;
        } catch (error) {
          console.error('[ReservationReminderScheduler] 문자 발송 실패', {
            reservationId: Number(reservation.id),
            kind: target.kind,
            errorType: error instanceof Error ? error.name : typeof error,
          });
        }
      }
    }

    console.log(`[ReservationReminderScheduler] ${sentCount}건 리마인더 발송`);
  } catch (error) {
    console.error('[ReservationReminderScheduler] 오류 발생:', error);
  }
};
