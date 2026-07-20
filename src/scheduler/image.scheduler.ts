import fs from 'fs';
import path from 'path';
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
// 로컬 스토리지 미사용 이미지 정리
// 대상: uploads/{2일 전 날짜}/ 폴더
// -------------------------------------------------------------------
const cleanupLocalImages = async (): Promise<void> => {
  const targetDate = getTargetDate(2);
  const targetDir = `uploads/${targetDate}`;

  // 대상 폴더가 없으면 스킵
  if (!fs.existsSync(targetDir)) {
    console.log(`[ImageScheduler] 대상 폴더 없음: ${targetDir}`);
    return;
  }

  const files = await fs.promises.readdir(targetDir);

  if (files.length === 0) {
    console.log(`[ImageScheduler] 삭제할 파일 없음: ${targetDir}`);
    return;
  }

  // URL → 파일 경로 매핑 (Map)
  // URL로 DB 조회하고, 삭제 시 파일 경로가 필요하므로 Map으로 관리
  const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
  const urlToPath = new Map<string, string>();

  for (const file of files) {
    const url = `${baseUrl}/uploads/${targetDate}/${file}`;
    const filePath = path.join(targetDir, file);
    urlToPath.set(url, filePath);
  }

  // DB에서 해당 URL 목록 중 실제 사용 중인 것만 IN 쿼리로 한 번에 조회
  const urls = Array.from(urlToPath.keys());
  const existingImages = await getPrisma().requestImage.findMany({
    where: { imageUrl: { in: urls } },
    select: { imageUrl: true },
  });

  // DB에 존재하는 URL을 Set으로 변환 (O(1) 조회)
  const existingUrls = new Set(existingImages.map((img) => img.imageUrl));

  // DB에 없는 URL = 미사용 이미지 → 삭제 대상
  const toDelete = urls.filter((url) => !existingUrls.has(url));

  if (toDelete.length === 0) {
    console.log(`[ImageScheduler] 미사용 이미지 없음`);
    return;
  }

  // 파일 삭제 - 실패해도 로그 남기고 다음 파일로 계속 진행
  let deletedCount = 0;
  for (const url of toDelete) {
    const filePath = urlToPath.get(url)!;
    try {
      await fs.promises.unlink(filePath);
      deletedCount++;
      console.log(`[ImageScheduler] 삭제 완료: ${filePath}`);
    } catch (err) {
      console.error(`[ImageScheduler] 삭제 실패: ${filePath}`, err);
    }
  }

  console.log(`[ImageScheduler] 로컬 정리 완료 - ${deletedCount}/${toDelete.length}개 삭제`);
};

// -------------------------------------------------------------------
// S3 미사용 이미지 정리 (S3 전환 시 활성화)
// npm install @aws-sdk/client-s3
// -------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const cleanupS3Images = async (): Promise<void> => {
  // TODO: S3 전환 시 아래 주석 해제 후 cleanupLocalImages 대신 사용
  //
  // import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
  //
  // const s3 = new S3Client({ region: process.env.AWS_REGION });
  // const targetDate = getTargetDate(2);
  // const prefix = `images/${targetDate}/`;
  //
  // // S3에서 해당 날짜 prefix 파일 목록 + LastModified 한 번에 조회
  // const listResult = await s3.send(new ListObjectsV2Command({
  //   Bucket: process.env.S3_BUCKET_NAME!,
  //   Prefix: prefix,
  // }));
  //
  // const objects = listResult.Contents ?? [];
  // if (objects.length === 0) {
  //   console.log(`[ImageScheduler] S3 대상 파일 없음: ${prefix}`);
  //   return;
  // }
  //
  // // URL → Key 매핑 (Map)
  // // URL로 DB 조회 후 삭제 시 S3 Key가 필요하므로 Map으로 관리
  // const urlToKey = new Map<string, string>();
  // for (const obj of objects) {
  //   const url = `https://${process.env.S3_BUCKET_NAME}.s3.amazonaws.com/${obj.Key}`;
  //   urlToKey.set(url, obj.Key!);
  // }
  //
  // // DB에서 사용 중인 URL IN 쿼리로 한 번에 조회
  // const urls = Array.from(urlToKey.keys());
  // const existingImages = await prisma.requestImage.findMany({
  //   where: { imageUrl: { in: urls } },
  //   select: { imageUrl: true },
  // });
  //
  // const existingUrls = new Set(existingImages.map((img) => img.imageUrl));
  //
  // // 삭제 목록 구성 (S3 deleteObjects API 형식)
  // const toDelete = urls
  //   .filter((url) => !existingUrls.has(url))
  //   .map((url) => ({ Key: urlToKey.get(url)! }));
  //
  // if (toDelete.length === 0) {
  //   console.log(`[ImageScheduler] S3 미사용 이미지 없음`);
  //   return;
  // }
  //
  // // S3 일괄 삭제 (API 1번 호출)
  // await s3.send(new DeleteObjectsCommand({
  //   Bucket: process.env.S3_BUCKET_NAME!,
  //   Delete: { Objects: toDelete },
  // }));
  //
  // console.log(`[ImageScheduler] S3 정리 완료 - ${toDelete.length}개 삭제`);
};

// -------------------------------------------------------------------
// 스케줄러 진입점 - server.ts에서 node-cron으로 매일 새벽 2시 호출
// -------------------------------------------------------------------
export const runImageCleanupScheduler = async (): Promise<void> => {
  console.log(`[ImageScheduler] 시작: ${new Date().toISOString()}`);
  try {
    // 로컬 환경에서 실행
    await cleanupLocalImages();

    // S3 전환 시: cleanupLocalImages() 대신 cleanupS3Images() 사용
    // await cleanupS3Images();
  } catch (error) {
    console.error('[ImageScheduler] 오류 발생:', error);
  }
  console.log(`[ImageScheduler] 종료: ${new Date().toISOString()}`);
};
