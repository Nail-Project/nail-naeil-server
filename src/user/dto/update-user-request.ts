// PATCH /api/users/me - 회원정보 수정 Request Body 검증 스키마
// 수정 가능한 필드만 정의하며, 부분 수정을 위해 모든 필드를 optional로 둔다.
import { z } from 'zod';

export const UpdateUserRequestSchema = z
  .object({
    nickname: z
      .string()
      .min(1, '닉네임은 1자 이상이어야 합니다.')
      .max(100, '닉네임은 100자 이하여야 합니다.'),
    phoneNumber: z.string().regex(/^01[0-9]{8,9}$/, '올바른 휴대폰 번호 형식이 아닙니다.'),
    email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  })
  .partial();

export type UpdateUserRequest = z.infer<typeof UpdateUserRequestSchema>;
