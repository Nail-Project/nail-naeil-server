import { DeleteObjectsCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { getPrisma } from '../infra/prisma';

// -------------------------------------------------------------------
// 유틸 - 서울 시간 기준 N일 전 날짜 문자열 반환 (예: '2026-07-11')
// toISOString()은 UTC 기준이라 KST(+9)로 보정 후 계산
// 예: 2026-07-14 02:00 KST → UTC로는 2026-07-13 17:00 → 보정 없이 계산하면 날짜가 하루 어긋남
// -------------------------------------------------------------------
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

const getTargetDate = (daysAgo: number): string => {
  const date = new Date(Date.now() + SEOUL_OFFSET_MS);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

// -------------------------------------------------------------------
// S3 미사용 이미지 정리
// 대상: images/{2일 전 날짜}/ prefix
// DB에 없는 S3 객체를 일괄 삭제한다.
// -------------------------------------------------------------------
const cleanupS3Images = async (): Promise<void> => {
  const s3 = new S3Client({
    region: process.env.AWS_REGION ?? 'ap-northeast-2',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    },
  });

  const bucket = process.env.S3_BUCKET_NAME ?? '';
  const region = process.env.AWS_REGION ?? 'ap-northeast-2';
  const targetDate = getTargetDate(2);
  const prefix = `images/${targetDate}/`;

  // S3에서 해당 날짜 prefix 파일 목록 조회
  const listResult = await s3.send(
    new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }),
  );

  const objects = listResult.Contents ?? [];
  if (objects.length === 0) {
    console.log(`[ImageScheduler] S3 대상 파일 없음: ${prefix}`);
    return;
  }

  // URL → Key 매핑 (Map)
  // multer-s3 location 형식: https://{bucket}.s3.{region}.amazonaws.com/{key}
  const urlToKey = new Map<string, string>();
  for (const obj of objects) {
    if (!obj.Key) continue;
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${obj.Key}`;
    urlToKey.set(url, obj.Key);
  }

  // DB에서 사용 중인 URL을 IN 쿼리로 한 번에 조회
  const urls = Array.from(urlToKey.keys());
  const existingImages = await getPrisma().requestImage.findMany({
    where: { imageUrl: { in: urls } },
    select: { imageUrl: true },
  });

  const existingUrls = new Set(existingImages.map((img) => img.imageUrl));

  // DB에 없는 URL = 미사용 이미지 → 삭제 대상
  const toDelete = urls
    .filter((url) => !existingUrls.has(url))
    .map((url) => ({ Key: urlToKey.get(url)! }));

  if (toDelete.length === 0) {
    console.log(`[ImageScheduler] S3 미사용 이미지 없음`);
    return;
  }

  // S3 일괄 삭제 (API 1번 호출, 최대 1000개)
  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: toDelete },
    }),
  );

  console.log(`[ImageScheduler] S3 정리 완료 - ${toDelete.length}개 삭제`);
};

// -------------------------------------------------------------------
// 스케줄러 진입점 - server.ts에서 node-cron으로 매일 새벽 2시 호출
// -------------------------------------------------------------------
export const runImageCleanupScheduler = async (): Promise<void> => {
  console.log(`[ImageScheduler] 시작: ${new Date().toISOString()}`);
  try {
    await cleanupS3Images();
  } catch (error) {
    console.error('[ImageScheduler] 오류 발생:', error);
  }
  console.log(`[ImageScheduler] 종료: ${new Date().toISOString()}`);
};
