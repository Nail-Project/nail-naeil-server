import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { createS3Client, S3_REGION } from '../infra/s3';
import { getPrisma } from '../infra/prisma';

// -------------------------------------------------------------------
// 유틸 - 서울 시간 기준 N일 전 날짜 문자열 반환 (예: '2026-07-11')
// toISOString()은 UTC 기준이라 KST(+9)로 보정 후 계산
// -------------------------------------------------------------------
const SEOUL_OFFSET_MS = 9 * 60 * 60 * 1000;

const getTargetDate = (daysAgo: number): string => {
  const date = new Date(Date.now() + SEOUL_OFFSET_MS);
  date.setUTCDate(date.getUTCDate() - daysAgo);
  return date.toISOString().slice(0, 10);
};

// DeleteObjectsCommand 한 번에 처리할 수 있는 최대 객체 수
const DELETE_CHUNK_SIZE = 1000;

// -------------------------------------------------------------------
// S3 미사용 이미지 정리
// 대상: images/{2일 전 날짜}/ prefix
// DB에 없는 S3 객체를 일괄 삭제한다.
// -------------------------------------------------------------------
const cleanupS3Images = async (): Promise<void> => {
  // 필수 환경 변수 확인 - 미설정 시 조기 종료
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    console.warn('[ImageScheduler] S3_BUCKET_NAME 미설정, 스케줄러 건너뜀');
    return;
  }

  const s3 = createS3Client();
  const region = S3_REGION;
  const targetDate = getTargetDate(2);
  const prefix = `images/${targetDate}/`;

  // ListObjectsV2는 최대 1000개 반환 → IsTruncated 확인해 전체 조회
  const allKeys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const listResult = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of listResult.Contents ?? []) {
      if (obj.Key) allKeys.push(obj.Key);
    }

    continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
  } while (continuationToken);

  if (allKeys.length === 0) {
    console.log(`[ImageScheduler] S3 대상 파일 없음: ${prefix}`);
    return;
  }

  // URL → Key 매핑 (Map)
  // multer-s3 / PutObjectCommand URL 형식: https://{bucket}.s3.{region}.amazonaws.com/{key}
  const urlToKey = new Map<string, string>();
  for (const key of allKeys) {
    const url = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
    urlToKey.set(url, key);
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

  // DeleteObjectsCommand는 최대 1000개 → 청크 단위로 분할 삭제
  let deletedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < toDelete.length; i += DELETE_CHUNK_SIZE) {
    const chunk = toDelete.slice(i, i + DELETE_CHUNK_SIZE);
    const result = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: chunk },
      }),
    );

    deletedCount += result.Deleted?.length ?? 0;

    // DeleteObjectsCommand는 개별 실패를 예외로 던지지 않고 Errors 배열에 담아 반환한다.
    if (result.Errors && result.Errors.length > 0) {
      failedCount += result.Errors.length;
      for (const err of result.Errors) {
        console.error(`[ImageScheduler] 삭제 실패: ${err.Key} - ${err.Message}`);
      }
    }
  }

  const summary = failedCount > 0 ? `, ${failedCount}개 실패` : '';
  console.log(`[ImageScheduler] S3 정리 완료 - ${deletedCount}/${toDelete.length}개 삭제${summary}`);
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
