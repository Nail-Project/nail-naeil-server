import { S3Client } from '@aws-sdk/client-s3';

export const S3_REGION = process.env.AWS_REGION ?? 'ap-northeast-2';

// accessKeyId/secretAccessKey 모두 설정된 경우에만 명시적으로 전달한다.
// 미설정 시 SDK 기본 자격 증명 체인(IAM 역할, 인스턴스 프로파일 등)을 사용한다.
// 빈 문자열을 명시적으로 전달하면 기본 체인이 비활성화되어 IAM 역할 기반 배포에서 인증 실패한다.
export function createS3Client(): S3Client {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  return new S3Client({
    region: S3_REGION,
    ...(accessKeyId && secretAccessKey
      ? { credentials: { accessKeyId, secretAccessKey } }
      : {}),
  });
}

// S3_BUCKET_NAME이 없으면 호출 시점에 즉시 실패시켜 요청 처리 중 오류를 방지한다.
export function getS3Bucket(): string {
  const bucket = process.env.S3_BUCKET_NAME;
  if (!bucket) {
    throw new Error('[S3] S3_BUCKET_NAME 환경 변수가 설정되지 않았습니다.');
  }
  return bucket;
}
