import dotenv from 'dotenv';
import cron from 'node-cron';
import { app } from './app';
import { runImageCleanupScheduler } from './scheduler/image.scheduler';

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
