import dotenv from 'dotenv';
import cron from 'node-cron';
import { app } from './app';
import { runImageCleanupScheduler } from './scheduler/image.scheduler';
import { runEstimateExpiryScheduler } from './scheduler/estimate-expiry.scheduler';
import { runReservationReminderScheduler } from './scheduler/reservation-reminder.scheduler';

dotenv.config();

// 필수 환경 변수가 없으면 부팅 단계에서 즉시 실패한다(fail-fast).
// 특히 JWT 시크릿이 없으면 인증 미들웨어가 모든 요청을 401로 처리해
// 서버 설정 오류가 인증 실패로 위장되므로, 여기서 먼저 검증한다.
const REQUIRED_ENV = ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'DATABASE_URL'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    throw new Error(`필수 환경 변수 ${key}가 설정되지 않았습니다.`);
  }
}

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// 매일 새벽 2시에 미사용 이미지 정리 스케줄러 실행
// cron 표현식: '0 2 * * *' → 매일 02:00
cron.schedule('0 2 * * *', runImageCleanupScheduler, {
  timezone: 'Asia/Seoul',
});

// 매일 새벽 3시에 만료된 견적 요청(endDate 지난 MATCHING)을 EXPIRED로 전환하고 마감 알림을 보낸다.
cron.schedule('0 3 * * *', () => runEstimateExpiryScheduler(), {
  timezone: 'Asia/Seoul',
});

// 매일 오전 9시에 예약 하루 전/당일 리마인더 문자를 발송한다.
cron.schedule('0 9 * * *', () => runReservationReminderScheduler(), {
  timezone: 'Asia/Seoul',
});
