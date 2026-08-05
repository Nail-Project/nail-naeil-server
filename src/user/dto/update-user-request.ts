// PATCH /api/v1/users/me - 회원정보 수정 Request Body 검증 스키마
// 수정 가능한 필드만 정의하며, 부분 수정을 위해 모든 필드를 optional로 둔다.
// 최초 가입 시 입력한 이름(nickname)과 전화번호(phoneNumber)는 정책상 수정 불가라 스키마에서 제외한다.
import { z } from 'zod';

export const UpdateUserRequestSchema = z
  .object({
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
    // 프로필 사진 S3 URL - image 도메인에 업로드 후 받은 URL을 전달한다.
    // 견적 이미지와 동일한 S3 URL 검증 정책을 사용한다.
    // https://{bucket}.s3.{region}.amazonaws.com/images/YYYY-MM-DD/{uuid}.{ext}
    profileImageUrl: z
      .string()
      .regex(
        /^https:\/\/[^/]+\.s3\.[^/]+\.amazonaws\.com\/images\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-zA-Z]+$/,
        '올바른 S3 이미지 URL이 아닙니다.',
      ),
  })
  .partial();

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
