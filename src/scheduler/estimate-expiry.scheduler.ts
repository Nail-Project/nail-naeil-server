import { getPrisma } from '../infra/prisma';
import { NotificationService } from '../notification/service/notification.service';

// -------------------------------------------------------------------
// 견적 요청 만료 처리 스케줄러
// 대상: 아직 매칭 중(MATCHING)인데 가능한 일정이 모두 지난 요청
//       (schedules 중 오늘 이후인 날짜가 단 하나도 없는 경우)
// 처리: 상태를 EXPIRED로 전환하고 요청자에게 "견적 응답 마감" 알림을 보낸다.
// -------------------------------------------------------------------
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

// KST 기준 오늘 자정을 UTC Date로 반환한다.
// schedule.date(@db.Date)가 이 값보다 이전이면 해당 날짜가 지난 것으로 본다.
const getTodayStartKst = (): Date => {
  const nowKst = new Date(Date.now() + SEOUL_OFFSET_MS);
  const y = nowKst.getUTCFullYear();
  const m = nowKst.getUTCMonth();
  const d = nowKst.getUTCDate();
  // KST 자정 = 그 날짜의 UTC 자정에서 9시간을 뺀 시각.
  return new Date(Date.UTC(y, m, d) - SEOUL_OFFSET_MS);
};

// 스케줄러 진입점 - server.ts에서 node-cron으로 매일 호출한다.
// notificationService는 테스트에서 주입할 수 있도록 인자로 받는다(기본값 실제 구현).
export const runEstimateExpiryScheduler = async (
  notificationService: NotificationService = new NotificationService(),
): Promise<void> => {
  const todayStart = getTodayStartKst();

  // cron 콜백은 아무도 반환된 Promise를 catch하지 않고, 전역 unhandledRejection 핸들러도
  // 없다. DB 조회/업데이트가 이 try 밖에서 던지면 Node 기본 동작으로 서버 프로세스 전체가
  // 죽으므로 스케줄러 실행 전체를 감싸 실패해도 로그만 남기고 프로세스는 살아있게 한다.
  try {
    // schedules 중 오늘 이후인 날짜가 하나도 없는(= 모든 일정이 지난) MATCHING 요청을 찾는다.
    // schedules가 비어 있는 경우(정상 데이터라면 발생하지 않음)도 none 조건에 걸려 함께 처리된다.
    const candidates = await getPrisma().estimateRequest.findMany({
      where: {
        status: 'MATCHING',
        schedules: { none: { date: { gte: todayStart } } },
      },
      select: { id: true, userId: true },
    });

    if (candidates.length === 0) {
      console.log('[EstimateExpiryScheduler] 만료 대상 없음');
      return;
    }

    // 요청별로 조건부 업데이트(status=MATCHING 조건 포함)를 수행해, 실제로 이 실행이
    // MATCHING→EXPIRED 전환에 성공한 건(count===1)에만 마감 알림을 보낸다.
    // 여러 인스턴스/재실행이 같은 대상을 잡아도 전환은 한 번만 성립하므로 중복 알림을 막는다.
    let expiredCount = 0;
    for (const request of candidates) {
      const { count } = await getPrisma().estimateRequest.updateMany({
        where: {
          id: request.id,
          status: 'MATCHING',
          schedules: { none: { date: { gte: todayStart } } },
        },
        data: { status: 'EXPIRED' },
      });
      if (count === 0) continue; // 다른 실행이 이미 처리함

      expiredCount += 1;

      // 마감 알림. 한 건 실패가 나머지 알림을 막지 않도록 개별 격리한다.
      try {
        await notificationService.notify({
          userId: request.userId,
          type: 'ESTIMATE_CLOSED',
          title: '견적 응답이 마감됐어요',
          body: '요청하신 견적의 응답 기간이 종료됐어요.',
          data: { estimateRequestId: request.id },
        });
      } catch (error) {
        console.error('[EstimateExpiryScheduler] 알림 생성 실패', {
          requestId: request.id,
          errorType: error instanceof Error ? error.name : typeof error,
        });
      }
    }

    console.log(`[EstimateExpiryScheduler] ${expiredCount}건 만료 처리 완료`);
  } catch (error) {
    console.error('[EstimateExpiryScheduler] 오류 발생:', error);
  }
};
