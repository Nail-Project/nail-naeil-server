// POST /api/users/signup - 회원가입 Request Body 검증 스키마
// zod로 런타임 검증 후 타입을 추론해 controller → service에서 그대로 사용한다.
import { z } from 'zod';

export const SignupUserRequestSchema = z.object({
  loginId: z
    .string()
    .min(4, '아이디는 4자 이상이어야 합니다.')
    .max(50, '아이디는 50자 이하여야 합니다.'),
  password: z
    .string()
    .min(8, '비밀번호는 8자 이상이어야 합니다.')
    .max(100, '비밀번호는 100자 이하여야 합니다.'),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  phoneNumber: z.string().regex(/^01[0-9]{8,9}$/, '올바른 휴대폰 번호 형식이 아닙니다.'),
});

export type SignupUserRequest = z.infer<typeof SignupUserRequestSchema>;
