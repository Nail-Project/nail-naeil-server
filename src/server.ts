import dotenv from 'dotenv';
import cron from 'node-cron';
import { app } from './app';
import { runImageCleanupScheduler } from './scheduler/image.scheduler';

dotenv.config();

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

// 매일 새벽 2시에 미사용 이미지 정리 스케줄러 실행
// cron 표현식: '0 2 * * *' → 매일 02:00
cron.schedule('0 2 * * *', runImageCleanupScheduler, {
  timezone: 'Asia/Seoul',
});
