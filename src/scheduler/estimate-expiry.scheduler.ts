import { getPrisma } from '../infra/prisma';
import { NotificationService } from '../notification/service/notification.service';

// -------------------------------------------------------------------
// 견적 요청 만료 처리 스케줄러
// 대상: 아직 매칭 중(MATCHING)인데 가능한 일정(endDate)이 이미 지난 요청
// 처리: 상태를 EXPIRED로 전환하고 요청자에게 "견적 응답 마감" 알림을 보낸다.
// -------------------------------------------------------------------
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

// KST 기준 오늘 자정을 UTC Date로 반환한다.
// endDate(@db.Date)가 이 값보다 이전이면 가능한 일정이 어제까지였다는 뜻이라 마감으로 본다.
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

  const expired = await getPrisma().estimateRequest.findMany({
    where: { status: 'MATCHING', endDate: { lt: todayStart } },
    select: { id: true, userId: true },
  });

  if (expired.length === 0) {
    console.log('[EstimateExpiryScheduler] 만료 대상 없음');
    return;
  }

  const ids = expired.map((request) => request.id);
  await getPrisma().estimateRequest.updateMany({
    where: { id: { in: ids } },
    data: { status: 'EXPIRED' },
  });

  // 각 요청자에게 마감 알림. 한 건 실패가 나머지 알림을 막지 않도록 개별 격리한다.
  for (const request of expired) {
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

  console.log(`[EstimateExpiryScheduler] ${ids.length}건 만료 처리 완료`);
};
