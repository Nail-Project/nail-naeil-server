// POST /api/users/login - 로그인 Request Body 검증 스키마
import { z } from 'zod';

export const LoginUserRequestSchema = z.object({
  // loginId 또는 email 중 하나를 단일 필드로 수신한다.
  identifier: z.string().min(1, '아이디 또는 이메일을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export type LoginUserRequest = z.infer<typeof LoginUserRequestSchema>;
